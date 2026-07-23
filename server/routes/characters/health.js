const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { emitCharacterHealthUpdate } = require('../../utils/socket');
const { applyHealthChange, applyDeathSaveResult, normalizeDeathState, reviveCharacter, markCharacterDead, clearDeathState } = require('../../utils/deathState');

const notifyCharacterHealthUpdate = async (db, characterObjectId, resolvedDamage) => {
  if (!db || !characterObjectId) {
    return;
  }

  try {
    const character = await db.collection('Characters').findOne(
      { _id: characterObjectId },
      {
        projection: {
          campaign: 1,
          tempHealth: 1,
          health: 1,
          characterId: 1,
          deathState: 1,
        },
      }
    );

    if (!character) {
      return;
    }

    const campaignId =
      typeof character.campaign === 'string' && character.campaign.trim() !== ''
        ? character.campaign.trim()
        : null;

    if (!campaignId) {
      return;
    }

    let normalizedCharacterId = null;
    if (typeof character.characterId === 'string' && character.characterId.trim() !== '') {
      normalizedCharacterId = character.characterId.trim();
    } else if (character._id) {
      try {
        normalizedCharacterId = character._id.toString();
      } catch (err) {
        normalizedCharacterId = String(character._id);
      }
    }

    if (!normalizedCharacterId) {
      return;
    }

    emitCharacterHealthUpdate({
      campaignId,
      characterId: normalizedCharacterId,
      tempHealth: character.tempHealth,
      health: character.health,
      deathState: character.deathState,
      ...(resolvedDamage ? { resolvedDamage } : {}),
    });
  } catch (error) {
    logger.warn('Failed to emit character health update', {
      error: error.message,
      characterId:
        (typeof characterObjectId?.toString === 'function'
          ? characterObjectId.toString()
          : String(characterObjectId)) || 'unknown',
    });
  }
};

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

  // This section will update tempHealth.
  characterRouter.route('/update-temphealth/:id').put(
    [
      body('tempHealth').optional().isInt().withMessage('tempHealth must be an integer').toInt(),
      body('delta').optional().isInt().withMessage('delta must be an integer').toInt(),
      body('eventId').optional().isString().trim().isLength({ min: 1, max: 160 }),
      body('sourceCombatantId').optional().isString().trim().isLength({ min: 1, max: 160 }),
      body('sourceLabel').optional().isString().trim().isLength({ min: 1, max: 100 }),
      body('rolledDamage').optional().isFloat().toFloat(),
      body().custom((value) => {
        if (Number.isInteger(value?.tempHealth) || Number.isInteger(value?.delta)) return true;
        throw new Error('tempHealth or delta is required');
      }),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { tempHealth, delta, eventId, sourceCombatantId, sourceLabel, rolledDamage } = matchedData(req, { locations: ['body'] });
      try {
        const collection = db_connect.collection('Characters');
        const existing = await collection.findOne(id);
        if (!existing) {
          return res.status(404).json({ message: 'Character not found' });
        }
        if (eventId && Array.isArray(existing.hpEventIds) && existing.hpEventIds.includes(eventId)) {
          return res.json({ success: true, duplicate: true, previousHp: existing.tempHealth, currentHp: existing.tempHealth, actualHpLost: 0, character: existing });
        }
        const authoritativePreviousHp = Number(existing.tempHealth ?? existing.health ?? 0);
        const requested = Number.isInteger(delta)
          ? Number(existing.tempHealth ?? existing.health ?? 0) + delta
          : tempHealth;
        const maxHp = Number.isFinite(Number(existing.health)) ? Number(existing.health) : requested;
        const nextHp = Math.max(0, Math.min(requested, maxHp));
        const outcome = applyHealthChange(existing, nextHp, existing.tempHealth);
        const update = { $set: { tempHealth: outcome.character.tempHealth, deathState: outcome.character.deathState } };
        if (eventId) update.$push = { hpEventIds: { $each: [eventId], $slice: -100 } };
        // The current value is part of the filter, making this an optimistic atomic
        // compare-and-swap. A racing delta is retried against the latest document.
        let result = await collection.updateOne({ ...id, tempHealth: existing.tempHealth }, update);
        if (!result?.matchedCount && Number.isInteger(delta)) {
          const latest = await collection.findOne(id);
          if (!latest) return res.status(404).json({ message: 'Character not found' });
          if (eventId && latest.hpEventIds?.includes(eventId)) {
            return res.json({ success: true, duplicate: true, previousHp: latest.tempHealth, currentHp: latest.tempHealth, actualHpLost: 0, character: latest });
          }
          const retryHp = Math.max(0, Math.min(Number(latest.tempHealth ?? latest.health ?? 0) + delta, Number(latest.health ?? Infinity)));
          const retryOutcome = applyHealthChange(latest, retryHp, latest.tempHealth);
          update.$set = { tempHealth: retryOutcome.character.tempHealth, deathState: retryOutcome.character.deathState };
          result = await collection.updateOne({ ...id, tempHealth: latest.tempHealth }, update);
          if (!result?.matchedCount) return res.status(409).json({ message: 'HP changed concurrently; retry the update.' });
          outcome.character = retryOutcome.character;
          outcome.event = retryOutcome.event;
          outcome.previousHp = latest.tempHealth;
        }
        const previousHp = Number(outcome.previousHp ?? authoritativePreviousHp);
        const actualHpLost = Math.max(0, previousHp - outcome.character.tempHealth);
        const resolvedDamage = eventId && actualHpLost > 0 ? {
          eventId,
          ...(sourceCombatantId ? { sourceCombatantId } : {}),
          ...(sourceLabel ? { sourceLabel } : {}),
          targetCombatantId: req.params.id,
          ...(Number.isFinite(rolledDamage) ? { rolledDamage } : {}),
          actualHpLost,
          previousHp,
          currentHp: outcome.character.tempHealth,
        } : undefined;
        await notifyCharacterHealthUpdate(db_connect, id._id, resolvedDamage);
        logger.info('character tempHealth updated');
        res.json({ success: true, message: 'User updated successfully', previousHp, currentHp: outcome.character.tempHealth, actualHpLost, character: outcome.character, deathState: outcome.character.deathState, deathEvent: outcome.event, eventId });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update health and stats.
  characterRouter.route('/update-health/:id').put(
    [
      body('health').isInt().withMessage('health must be an integer').toInt(),
      body('str').isInt().toInt(),
      body('dex').isInt().toInt(),
      body('con').isInt().toInt(),
      body('int').isInt().toInt(),
      body('wis').isInt().toInt(),
      body('cha').isInt().toInt(),
      body('startStatTotal').isInt().toInt(),
      body('abilityScoreImprovement').optional().isObject(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const fields = matchedData(req, { locations: ['body'] });
      
      try {
        await db_connect.collection('Characters').updateOne(id, {
          $set: fields,
        });
        await notifyCharacterHealthUpdate(db_connect, id._id);
        logger.info('Character health and stats updated');
        res.json({ message: 'User updated successfully' });
      } catch (error) {
        logger.error(error);
        next(error);
      }
    }
  );



  characterRouter.route('/death-state/:id').put(
    [
      body('action').isString().trim().notEmpty(),
      body('roll').optional().isInt({ min: 1, max: 20 }).toInt(),
      body('hp').optional().isInt({ min: 0 }).toInt(),
      body('allowDuplicate').optional().isBoolean().toBoolean(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { action, roll, hp, allowDuplicate } = matchedData(req, { locations: ['body'] });
      try {
        const existing = await db_connect.collection('Characters').findOne(id);
        if (!existing) return res.status(404).json({ message: 'Character not found' });
        let outcome;
        const state = normalizeDeathState(existing.deathState);
        if (action === 'roll') outcome = applyDeathSaveResult(existing, roll || Math.floor(Math.random() * 20) + 1, { allowDuplicate });
        else if (action === 'addSuccess') outcome = applyDeathSaveResult({ ...existing, deathState: { ...state, rolledThisTurn: false, successes: Math.min(2, state.successes) } }, 10, { allowDuplicate: true });
        else if (action === 'addFailure') outcome = applyDeathSaveResult({ ...existing, deathState: { ...state, rolledThisTurn: false, failures: Math.min(2, state.failures) } }, 2, { allowDuplicate: true });
        else if (action === 'removeSuccess') outcome = { character: { ...existing, deathState: { ...state, successes: Math.max(0, state.successes - 1) } }, event: 'manual', message: `${existing.characterName || existing.name || 'Character'} death save success removed.` };
        else if (action === 'removeFailure') outcome = { character: { ...existing, deathState: { ...state, failures: Math.max(0, state.failures - 1), isDead: false, isDying: true } }, event: 'manual', message: `${existing.characterName || existing.name || 'Character'} death save failure removed.` };
        else if (action === 'revive') outcome = reviveCharacter(existing, hp || 1);
        else if (action === 'markDead') outcome = markCharacterDead(existing);
        else if (action === 'reset') outcome = { character: clearDeathState(existing), event: 'manual', message: `${existing.characterName || existing.name || 'Character'} death saves reset.` };
        else return res.status(400).json({ message: 'Unsupported death-state action' });
        await db_connect.collection('Characters').updateOne(id, { $set: { tempHealth: outcome.character.tempHealth, deathState: outcome.character.deathState } });
        await notifyCharacterHealthUpdate(db_connect, id._id);
        res.json({ deathState: outcome.character.deathState, tempHealth: outcome.character.tempHealth, event: outcome.event, message: outcome.message, rollLog: outcome.rollLog, log: outcome.log });
      } catch (err) { next(err); }
    }
  );

  router.use('/characters', characterRouter);
};
