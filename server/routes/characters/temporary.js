const { body, matchedData } = require('express-validator');
const { ObjectId } = require('mongodb');
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { emitCharacterMetadataUpdate } = require('../../utils/socket');

const SIZE_KEYS = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);

const validateSizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (typeof value !== 'string') {
    throw new Error('temporarySize must be a string');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase();
  if (!SIZE_KEYS.has(normalized)) {
    throw new Error('temporarySize must be a valid D&D size category');
  }

  return true;
};

const formatSizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();
  if (!SIZE_KEYS.has(normalized)) {
    return null;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const sanitizeSpeedBonus = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('temporarySpeedBonus must be a number');
  }

  return parsed;
};

module.exports = (router) => {
  const characterRouter = express.Router();

  characterRouter.use(authenticateToken);

  characterRouter
    .route('/:id/temporary-state')
    .put(
      [
        body('temporarySize')
          .optional({ nullable: true })
          .custom(validateSizeValue)
          .customSanitizer(formatSizeValue),
        body('temporarySpeedBonus')
          .optional({ nullable: true })
          .customSanitizer(sanitizeSpeedBonus),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid ID' });
        }

        const db = req.db;
        const collection = db.collection('Characters');
        const characterObjectId = new ObjectId(id);

        const fields = matchedData(req, {
          locations: ['body'],
          includeOptionals: true,
        });

        const { temporarySize, temporarySpeedBonus } = fields;

        if (temporarySize === undefined && temporarySpeedBonus === undefined) {
          return res.status(400).json({ message: 'No temporary state provided' });
        }

        const setOps = {};
        const unsetOps = {};

        if (temporarySize !== undefined) {
          if (temporarySize === null) {
            unsetOps.temporarySize = '';
          } else {
            setOps.temporarySize = temporarySize;
          }
        }

        if (temporarySpeedBonus !== undefined) {
          if (temporarySpeedBonus === null) {
            unsetOps.temporarySpeedBonus = '';
          } else {
            setOps.temporarySpeedBonus = temporarySpeedBonus;
          }
        }

        if (Object.keys(setOps).length === 0 && Object.keys(unsetOps).length === 0) {
          return res.status(400).json({ message: 'No temporary state provided' });
        }

        const update = {};
        if (Object.keys(setOps).length > 0) {
          update.$set = setOps;
        }
        if (Object.keys(unsetOps).length > 0) {
          update.$unset = unsetOps;
        }

        try {
          const result = await collection.findOneAndUpdate(
            { _id: characterObjectId },
            update,
            {
              returnDocument: 'after',
              projection: {
                campaign: 1,
                characterId: 1,
                temporarySize: 1,
                temporarySpeedBonus: 1,
              },
            }
          );

          if (!result.value) {
            return res.status(404).json({ message: 'Character not found' });
          }

          const updatedCharacter = result.value;
          const campaignId =
            typeof updatedCharacter.campaign === 'string' && updatedCharacter.campaign.trim() !== ''
              ? updatedCharacter.campaign.trim()
              : null;

          let normalizedCharacterId = null;
          if (
            typeof updatedCharacter.characterId === 'string' &&
            updatedCharacter.characterId.trim() !== ''
          ) {
            normalizedCharacterId = updatedCharacter.characterId.trim();
          } else if (updatedCharacter._id) {
            try {
              normalizedCharacterId = updatedCharacter._id.toString();
            } catch (error) {
              normalizedCharacterId = String(updatedCharacter._id);
            }
          }

          const responsePayload = {};
          if (temporarySize !== undefined) {
            responsePayload.temporarySize =
              typeof updatedCharacter.temporarySize === 'string' &&
              updatedCharacter.temporarySize.trim() !== ''
                ? updatedCharacter.temporarySize.trim()
                : null;
          }

          if (temporarySpeedBonus !== undefined) {
            responsePayload.temporarySpeedBonus =
              typeof updatedCharacter.temporarySpeedBonus === 'number'
                ? updatedCharacter.temporarySpeedBonus
                : null;
          }

          if (campaignId && normalizedCharacterId) {
            emitCharacterMetadataUpdate(campaignId, {
              characterId: normalizedCharacterId,
              ...responsePayload,
            });
          }

          return res.json(responsePayload);
        } catch (error) {
          logger.error('Failed to update temporary character state', {
            error: error.message,
            characterId: id,
          });
          return next(error);
        }
      }
    );

  router.use('/characters', characterRouter);
};
