const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { emitCharacterHealthUpdate } = require('../../utils/socket');
const { applyHealthChange, applyDeathSaveResult, normalizeDeathState, reviveCharacter, markCharacterDead, clearDeathState } = require('../../utils/deathState');

const notifyCharacterHealthUpdate = async (db, characterObjectId) => {
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
    [body('tempHealth').isInt().withMessage('tempHealth must be an integer').toInt()],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { tempHealth } = matchedData(req, { locations: ['body'] });
      try {
        const existing = await db_connect.collection('Characters').findOne(id);
        if (!existing) {
          return res.status(404).json({ message: 'Character not found' });
        }
        const outcome = applyHealthChange(existing, tempHealth, existing.tempHealth);
        await db_connect.collection('Characters').updateOne(id, {
          $set: { tempHealth: outcome.character.tempHealth, deathState: outcome.character.deathState },
        });
        await notifyCharacterHealthUpdate(db_connect, id._id);
        logger.info('character tempHealth updated');
        res.json({ message: 'User updated successfully', deathState: outcome.character.deathState, deathEvent: outcome.event });
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

