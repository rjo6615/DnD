const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { emitCharacterHealthUpdate } = require('../../utils/socket');

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
        await db_connect.collection('Characters').updateOne(id, {
          $set: { tempHealth },
        });
        await notifyCharacterHealthUpdate(db_connect, id._id);
        logger.info('character tempHealth updated');
        res.json({ message: 'User updated successfully' });
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

  router.use('/characters', characterRouter);
};

