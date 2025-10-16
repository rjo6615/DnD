const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const {
  numericFields,
  stringFields,
  skillFields,
  skillNames,
} = require('../fieldConstants');
const proficiencyBonus = require('../../utils/proficiency');
const collectAllowedSkills = require('../../utils/collectAllowedSkills');
const collectAllowedExpertise = require('../../utils/collectAllowedExpertise');
const { normalizeEquipmentMap } = require('../../constants/equipmentSlots');
const {
  emitCharacterMetadataUpdate,
  emitMapUpdate,
  emitCombatUpdate,
} = require('../../utils/socket');
const {
  buildCampaignMapPayload,
  normalizeCampaignMapState,
} = require('../../utils/campaignMaps');

const countFeatProficiencies = (feat = []) => {
  const profs = new Set();
  if (Array.isArray(feat)) {
    feat.forEach((ft) => {
      if (ft && ft.skills && typeof ft.skills === 'object') {
        Object.keys(ft.skills).forEach((skill) => {
          if (ft.skills[skill] && ft.skills[skill].proficient) {
            profs.add(skill);
          }
        });
      }
    });
  }
  return profs.size;
};

const countRaceProficiencies = (race) => {
  if (race && race.skills && typeof race.skills === 'object') {
    return Object.values(race.skills).filter((s) => s && s.proficient).length;
  }
  return 0;
};

const countBackgroundProficiencies = (background) => {
  if (background && background.skills && typeof background.skills === 'object') {
    return Object.values(background.skills).filter((s) => s && s.proficient).length;
  }
  return 0;
};

const countFeatExpertise = (feat = []) => {
  let count = 0;
  if (Array.isArray(feat)) {
    feat.forEach((ft) => {
      if (ft && ft.skills && typeof ft.skills === 'object') {
        Object.values(ft.skills).forEach((info) => {
          if (info && info.expertise) count += 1;
        });
      }
    });
  }
  return count;
};

const countRaceExpertise = (race) => {
  if (race && race.skills && typeof race.skills === 'object') {
    return Object.values(race.skills).filter((s) => s && s.expertise).length;
  }
  return 0;
};

const countBackgroundExpertise = (background) => {
  if (background && background.skills && typeof background.skills === 'object') {
    return Object.values(background.skills).filter((s) => s && s.expertise).length;
  }
  return 0;
};

const countClassExpertise = (occupation = []) => {
  let count = 0;
  if (Array.isArray(occupation)) {
    occupation.forEach((occ) => {
      const name = (
        typeof occ.Occupation === 'string'
          ? occ.Occupation
          : typeof occ.Name === 'string'
          ? occ.Name
          : ''
      ).toLowerCase();
      const level = occ.Level || occ.level || 0;
      if (name === 'rogue') {
        if (level >= 1) count += 2;
        if (level >= 6) count += 2;
      }
      if (name === 'bard') {
        if (level >= 3) count += 2;
        if (level >= 10) count += 2;
      }
    });
  }
  return count;
};

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

  // This section will get a single character by id
  characterRouter.route('/:id').get(async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    try {
      const db_connect = req.db;
      const myquery = { _id: ObjectId(req.params.id) };
      const result = await db_connect
        .collection('Characters')
        .findOne(myquery);
      if (result) {
        result.equipment = normalizeEquipmentMap(result.equipment);
        const totalLevel = Array.isArray(result.occupation)
          ? result.occupation.reduce((sum, o) => sum + (o.Level || 0), 0)
          : 0;
        result.proficiencyBonus = proficiencyBonus(totalLevel);
        const occupationPoints = Array.isArray(result.occupation)
          ? result.occupation.reduce(
              (sum, o) => sum + Number(o.proficiencyPoints || 0),
              0
            )
          : 0;
        const featPoints = countFeatProficiencies(result.feat);
        const racePoints = countRaceProficiencies(result.race);
        const backgroundPoints = countBackgroundProficiencies(result.background);
        result.proficiencyPoints =
          occupationPoints + featPoints + racePoints + backgroundPoints;
        result.allowedSkills = collectAllowedSkills(
          result.occupation,
          result.feat,
          result.race,
          result.background
        );
        const classExpertise = countClassExpertise(result.occupation);
        const featExpertise = countFeatExpertise(result.feat);
        const raceExpertise = countRaceExpertise(result.race);
        const backgroundExpertise = countBackgroundExpertise(result.background);
        result.expertisePoints =
          classExpertise + featExpertise + raceExpertise + backgroundExpertise;
        result.allowedExpertise = collectAllowedExpertise(
          result.occupation,
          result.feat,
          result.race,
          result.background
        );
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will get a list of all the characters.
  characterRouter.route('/select').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection('Characters')
        .find({})
        .toArray();
      const withBonus = result.map((char) => {
        const totalLevel = Array.isArray(char.occupation)
          ? char.occupation.reduce((sum, o) => sum + (o.Level || 0), 0)
          : 0;
        const occupationPoints = Array.isArray(char.occupation)
          ? char.occupation.reduce(
              (sum, o) => sum + Number(o.proficiencyPoints || 0),
              0
            )
          : 0;
        const featPoints = countFeatProficiencies(char.feat);
        const racePoints = countRaceProficiencies(char.race);
        const backgroundPoints = countBackgroundProficiencies(char.background);
        const equipment = normalizeEquipmentMap(char.equipment);
        return {
          ...char,
          equipment,
          allowedSkills: collectAllowedSkills(
            char.occupation,
            char.feat,
            char.race,
            char.background
          ),
          allowedExpertise: collectAllowedExpertise(
            char.occupation,
            char.feat,
            char.race,
            char.background
          ),
          proficiencyBonus: proficiencyBonus(totalLevel),
          proficiencyPoints:
            occupationPoints + featPoints + racePoints + backgroundPoints,
          expertisePoints:
            countClassExpertise(char.occupation) +
            countFeatExpertise(char.feat) +
            countRaceExpertise(char.race) +
            countBackgroundExpertise(char.background),
        };
      });
      res.json(withBonus);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new character.
  // Includes numeric stats like initiative, AC, speed, passive scores, and HP bonuses.
  const numericCharacterFields = [...numericFields];
  const stringCharacterFields = [...stringFields];
  const currencyFields = ['cp', 'sp', 'gp', 'pp'];

  characterRouter.post(
    '/add',
    [
      body('token').trim().notEmpty().withMessage('token is required'),
      body('characterName').trim().notEmpty().withMessage('characterName is required'),
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('occupation').optional().isArray(),
      body('occupation.*.Level').isInt().toInt(),
      body('occupation.*.Occupation').optional().trim(),
      body('occupation.*.Health').optional().isInt().toInt(),
      body('occupation.*.proficiencyPoints').optional().isInt().toInt(),
      body('occupation.*.armor').optional().isArray(),
      body('occupation.*.weapons').optional().isArray(),
      body('occupation.*.tools').optional().isArray(),
      body('occupation.*.savingThrows').optional().isArray(),
      body('occupation.*.skills').optional().isObject(),
      body('feat').optional().isArray(),
      body('race').optional().isObject(),
      body('background').optional().isObject(),
      body('abilityScoreImprovement').optional().isObject(),
      body('weapon').optional().isArray(),
      body('armor').optional().isArray(),
      body('item').optional().isArray(),
      body('spells').optional().isArray(),
      body('spells.*.name').optional().isString(),
      body('spells.*.level').optional().isInt().toInt(),
      body('spells.*.damage').optional().isString(),
      body('spells.*.castingTime').optional().isString(),
      body('spells.*.range').optional().isString(),
      body('spells.*.duration').optional().isString(),
      body('sex').optional().trim(),
      body('diceColor').optional().trim(),
      ...currencyFields.map((field) => body(field).optional().isInt().toInt()),
      ...numericCharacterFields.map((field) => body(field).optional().isInt().toInt()),
      ...stringCharacterFields.map((field) =>
        body(field).optional().isString().trim()
      ),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });

      currencyFields.forEach((field) => {
        if (typeof myobj[field] !== 'number') {
          myobj[field] = 0;
        }
      });

      if (!myobj.size && myobj.race && typeof myobj.race.size === 'string') {
        myobj.size = myobj.race.size;
      }

      // initialize skills structure with proficiency/expertise flags if not provided
      if (!myobj.skills) {
        // initialize default proficiency/expertise structure for all skills
        myobj.skills = {};
        skillNames.forEach((skill) => {
          myobj.skills[skill] = { ...skillFields[skill] };
        });
      }
      myobj.allowedSkills = collectAllowedSkills(
        myobj.occupation,
        myobj.feat,
        myobj.race,
        myobj.background
      );
      myobj.allowedExpertise = collectAllowedExpertise(
        myobj.occupation,
        myobj.feat,
        myobj.race,
        myobj.background
      );

      if (!myobj.abilityScoreImprovement) {
        myobj.abilityScoreImprovement = {};
      }

      // derive proficiency bonus from total character level
      const totalLevel = Array.isArray(myobj.occupation)
        ? myobj.occupation.reduce((sum, o) => sum + (o.Level || 0), 0)
        : 0;
      myobj.proficiencyBonus = proficiencyBonus(totalLevel);
      const occupationPoints = Array.isArray(myobj.occupation)
        ? myobj.occupation.reduce(
            (sum, o) => sum + Number(o.proficiencyPoints || 0),
            0
          )
        : 0;
      const featPoints = countFeatProficiencies(myobj.feat);
      const racePoints = countRaceProficiencies(myobj.race);
      const backgroundPoints = countBackgroundProficiencies(myobj.background);
      myobj.proficiencyPoints =
        occupationPoints + featPoints + racePoints + backgroundPoints;
      const classExpertise = countClassExpertise(myobj.occupation);
      const featExpertise = countFeatExpertise(myobj.feat);
      const raceExpertise = countRaceExpertise(myobj.race);
      const backgroundExpertise = countBackgroundExpertise(myobj.background);
      myobj.expertisePoints =
        classExpertise + featExpertise + raceExpertise + backgroundExpertise;
      if (myobj.race && myobj.race.speed != null) {
        myobj.speed = myobj.race.speed;
      }
      if (myobj.race && myobj.race.skills) {
        Object.keys(myobj.race.skills).forEach((skill) => {
          if (!myobj.skills[skill]) myobj.skills[skill] = { ...skillFields[skill] };
          myobj.skills[skill].proficient = myobj.race.skills[skill].proficient;
          myobj.skills[skill].expertise = myobj.race.skills[skill].expertise || false;
        });
      }
      if (myobj.background && myobj.background.skills) {
        Object.keys(myobj.background.skills).forEach((skill) => {
          if (!myobj.skills[skill]) myobj.skills[skill] = { ...skillFields[skill] };
          myobj.skills[skill].proficient = myobj.background.skills[skill].proficient;
          myobj.skills[skill].expertise = myobj.background.skills[skill].expertise || false;
        });
      }

      try {
        const result = await db_connect.collection('Characters').insertOne(myobj);
        res.json({
          ...result,
          proficiencyPoints: myobj.proficiencyPoints,
          expertisePoints: myobj.expertisePoints,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will delete a character
  characterRouter.route('/delete-character/:id').delete(async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const db_connect = req.db;
    const charactersCollection = db_connect.collection('Characters');
    const query = { _id: ObjectId(req.params.id) };

    try {
      const result = await charactersCollection.findOneAndDelete(query);
      const deletedCharacter = result.value;

      if (!deletedCharacter) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const deletedIds = new Set();
      if (deletedCharacter._id) {
        deletedIds.add(String(deletedCharacter._id));
      }
      if (
        typeof deletedCharacter.characterId === 'string' &&
        deletedCharacter.characterId.trim() !== ''
      ) {
        deletedIds.add(deletedCharacter.characterId.trim());
      }

      const campaignName =
        typeof deletedCharacter.campaign === 'string' &&
        deletedCharacter.campaign.trim() !== ''
          ? deletedCharacter.campaign.trim()
          : null;

      if (campaignName) {
        const campaignsCollection = db_connect.collection('Campaigns');
        const campaign = await campaignsCollection.findOne({ campaignName });

        if (campaign) {
          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection: campaignsCollection,
          });

          const nextTokens = {};

          if (
            normalizedCampaign.mapTokens &&
            typeof normalizedCampaign.mapTokens === 'object'
          ) {
            Object.keys(normalizedCampaign.mapTokens).forEach((mapId) => {
              const mapTokens = normalizedCampaign.mapTokens[mapId];
              if (!mapTokens || typeof mapTokens !== 'object') {
                return;
              }

              const filteredTokens = Object.keys(mapTokens).reduce(
                (acc, tokenKey) => {
                  const tokenEntry = mapTokens[tokenKey];
                  if (!tokenEntry || typeof tokenEntry !== 'object') {
                    return acc;
                  }

                  const candidateId =
                    typeof tokenEntry.characterId === 'string' &&
                    tokenEntry.characterId.trim() !== ''
                      ? tokenEntry.characterId.trim()
                      : typeof tokenKey === 'string' && tokenKey.trim() !== ''
                      ? tokenKey.trim()
                      : null;

                  if (!candidateId) {
                    return acc;
                  }

                  if (deletedIds.has(candidateId)) {
                    return acc;
                  }

                  acc[candidateId] = { ...tokenEntry, characterId: candidateId };
                  return acc;
                },
                {}
              );

              if (Object.keys(filteredTokens).length > 0) {
                nextTokens[mapId] = filteredTokens;
              }
            });
          }

          const mapPayload = buildCampaignMapPayload(
            normalizedCampaign.maps,
            normalizedCampaign.activeMapId,
            nextTokens
          );

          const existingParticipants = Array.isArray(
            normalizedCampaign.combat?.participants
          )
            ? normalizedCampaign.combat.participants
            : [];

          const participants = existingParticipants.filter((participant) => {
            if (!participant || typeof participant !== 'object') {
              return false;
            }

            if (
              typeof participant.characterId === 'string' &&
              participant.characterId.trim() !== ''
            ) {
              return !deletedIds.has(participant.characterId.trim());
            }

            return true;
          });

          let activeTurn = Number(normalizedCampaign.combat?.activeTurn);
          if (!Number.isInteger(activeTurn)) {
            activeTurn = null;
          }

          if (activeTurn !== null) {
            if (activeTurn < 0) {
              activeTurn = participants.length > 0 ? 0 : null;
            } else if (activeTurn >= participants.length) {
              activeTurn =
                participants.length > 0
                  ? Math.min(activeTurn, participants.length - 1)
                  : null;
            }
          }

          const combatState = { participants, activeTurn };

          await campaignsCollection.updateOne(
            { campaignName },
            {
              $set: {
                mapTokens: mapPayload.tokensByMapId,
                activeMapId: mapPayload.activeMapId,
                map: mapPayload.map || null,
                combat: combatState,
              },
            }
          );

          emitMapUpdate(campaignName, mapPayload);
          emitCombatUpdate(campaignName, combatState);
        }
      }

      logger.info('1 character deleted');
      return res.json({ acknowledged: true, deletedCount: 1 });
    } catch (err) {
      next(err);
    }
  });

  // This section will update level.
  characterRouter.route('/update-level/:id').put(
    [
      body('level').isInt().withMessage('level must be an integer').toInt(),
      body('health').isInt().withMessage('health must be an integer').toInt(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      const selectedOccupation = req.body.selectedOccupation;
      const { level, health } = matchedData(req, { locations: ['body'] });

      const updateOperation = {
        $set: {
          'occupation.$.Level': level,
          health,
        },
      };

      try {
        const result = await db_connect
          .collection('Characters')
          .findOneAndUpdate(
            {
              _id: ObjectId(req.params.id),
              occupation: {
                $elemMatch: {
                  Occupation: selectedOccupation,
                },
              },
            },
            updateOperation,
            { returnDocument: 'after' }
          );
        if (result.value) {
          const updatedChar = result.value;
          const totalLevel = Array.isArray(updatedChar.occupation)
            ? updatedChar.occupation.reduce((sum, o) => sum + (o.Level || 0), 0)
            : 0;
          const profBonus = proficiencyBonus(totalLevel);
          await db_connect.collection('Characters').updateOne(
            { _id: ObjectId(req.params.id) },
            { $set: { proficiencyBonus: profBonus } }
          );
          logger.info(`Character updated for Occupation: ${selectedOccupation}`);
          res.json({ message: 'Update complete', proficiencyBonus: profBonus });
        }
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update dice color.
  characterRouter.route('/update-dice-color/:id').put(
    [body('diceColor').isString().withMessage('diceColor must be a string').trim()],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { diceColor } = matchedData(req, { locations: ['body'] });
      try {
        const updateResult = await db_connect.collection('Characters').findOneAndUpdate(
          id,
          {
            $set: { diceColor },
          },
          { returnDocument: 'after' }
        );

        const updatedCharacter = updateResult && updateResult.value ? updateResult.value : null;
        if (!updatedCharacter) {
          return res.status(404).json({ message: 'Character not found' });
        }

        const rawCampaignId =
          typeof updatedCharacter.campaign === 'string'
            ? updatedCharacter.campaign
            : typeof updatedCharacter.campaignId === 'string'
              ? updatedCharacter.campaignId
              : null;
        const campaignId = rawCampaignId && rawCampaignId.trim() !== '' ? rawCampaignId.trim() : null;
        const characterId =
          updatedCharacter._id && typeof updatedCharacter._id.toString === 'function'
            ? updatedCharacter._id.toString()
            : typeof updatedCharacter.characterId === 'string'
              ? updatedCharacter.characterId
              : null;

        const payload = {
          campaignId,
          characterId,
          diceColor,
        };

        if (campaignId && characterId) {
          emitCharacterMetadataUpdate(campaignId, payload);
        }

        logger.info('Dice Color updated');
        res.json(payload);
      } catch (err) {
        next(err);
      }
    }
  );

  characterRouter.route('/:id/temporary-size').put(
    [
      body('temporarySize')
        .optional({ nullable: true })
        .isString()
        .withMessage('temporarySize must be a string')
        .trim(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const db_connect = req.db;
      const { temporarySize } = matchedData(req, {
        locations: ['body'],
        includeOptionals: true,
      });

      const updates = {};
      const unset = {};

      if (temporarySize !== undefined) {
        const trimmedSize =
          typeof temporarySize === 'string' ? temporarySize.trim() : '';
        if (trimmedSize) {
          updates.temporarySize = trimmedSize;
        } else {
          unset.temporarySize = '';
        }
      }

      if (Object.keys(updates).length === 0 && Object.keys(unset).length === 0) {
        return res.status(400).json({ message: 'No updates provided' });
      }

      const updateDoc = {};
      if (Object.keys(updates).length > 0) {
        updateDoc.$set = updates;
      }
      if (Object.keys(unset).length > 0) {
        updateDoc.$unset = unset;
      }

      try {
        const result = await db_connect.collection('Characters').findOneAndUpdate(
          { _id: ObjectId(req.params.id) },
          updateDoc,
          { returnDocument: 'after' }
        );

        const updatedCharacter = result && result.value ? result.value : null;
        if (!updatedCharacter) {
          return res.status(404).json({ message: 'Character not found' });
        }

        const normalizedTemporarySize =
          typeof updatedCharacter.temporarySize === 'string' &&
          updatedCharacter.temporarySize.trim() !== ''
            ? updatedCharacter.temporarySize.trim()
            : null;

        const rawCampaignId =
          typeof updatedCharacter.campaign === 'string'
            ? updatedCharacter.campaign
            : typeof updatedCharacter.campaignId === 'string'
              ? updatedCharacter.campaignId
              : null;
        const campaignId =
          rawCampaignId && rawCampaignId.trim() !== '' ? rawCampaignId.trim() : null;
        const characterId =
          updatedCharacter._id && typeof updatedCharacter._id.toString === 'function'
            ? updatedCharacter._id.toString()
            : typeof updatedCharacter.characterId === 'string'
              ? updatedCharacter.characterId
              : null;

        if (campaignId && characterId) {
          emitCharacterMetadataUpdate(campaignId, {
            characterId,
            campaignId,
            temporarySize: normalizedTemporarySize,
          });
        }

        logger.info('Temporary size updated for character');

        res.json({
          campaignId,
          characterId,
          temporarySize: normalizedTemporarySize,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  characterRouter.route('/:id/figurine').put(
    [
      body('figurineImageUrl')
        .optional({ nullable: true })
        .isString()
        .withMessage('figurineImageUrl must be a string')
        .trim(),
      body('figurineImagePublicId')
        .optional({ nullable: true })
        .isString()
        .withMessage('figurineImagePublicId must be a string')
        .trim(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const db_connect = req.db;
      const { figurineImageUrl, figurineImagePublicId } = matchedData(req, {
        locations: ['body'],
        includeOptionals: true,
      });

      const updates = {};
      const unset = {};

      if (figurineImageUrl !== undefined) {
        const trimmedUrl = typeof figurineImageUrl === 'string' ? figurineImageUrl.trim() : '';
        if (trimmedUrl) {
          updates.figurineImageUrl = trimmedUrl;
        } else {
          unset.figurineImageUrl = '';
        }
      }

      if (figurineImagePublicId !== undefined) {
        const trimmedId =
          typeof figurineImagePublicId === 'string' ? figurineImagePublicId.trim() : '';
        if (trimmedId) {
          updates.figurineImagePublicId = trimmedId;
        } else {
          unset.figurineImagePublicId = '';
        }
      }

      if (Object.keys(updates).length === 0 && Object.keys(unset).length === 0) {
        return res.status(400).json({ message: 'No updates provided' });
      }

      const updateDoc = {};
      if (Object.keys(updates).length > 0) {
        updateDoc.$set = updates;
      }
      if (Object.keys(unset).length > 0) {
        updateDoc.$unset = unset;
      }

      try {
        const result = await db_connect.collection('Characters').findOneAndUpdate(
          { _id: ObjectId(req.params.id) },
          updateDoc,
          { returnDocument: 'after' }
        );

        const updatedCharacter = result && result.value ? result.value : null;
        if (!updatedCharacter) {
          return res.status(404).json({ message: 'Character not found' });
        }

        const payload = {
          figurineImageUrl:
            typeof updatedCharacter.figurineImageUrl === 'string'
              ? updatedCharacter.figurineImageUrl
              : null,
          figurineImagePublicId:
            typeof updatedCharacter.figurineImagePublicId === 'string'
              ? updatedCharacter.figurineImagePublicId
              : null,
        };

        const rawCampaignId =
          typeof updatedCharacter.campaign === 'string'
            ? updatedCharacter.campaign
            : typeof updatedCharacter.campaignId === 'string'
              ? updatedCharacter.campaignId
              : null;
        const campaignId = rawCampaignId && rawCampaignId.trim() !== '' ? rawCampaignId.trim() : null;
        const characterId =
          updatedCharacter._id && typeof updatedCharacter._id.toString === 'function'
            ? updatedCharacter._id.toString()
            : typeof updatedCharacter.characterId === 'string'
              ? updatedCharacter.characterId
              : null;

        if (campaignId && characterId) {
          emitCharacterMetadataUpdate(campaignId, { ...payload, characterId });
        }

        logger.info('Figurine imagery updated for character');

        res.json({ ...payload, campaignId, characterId });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update feats.
  characterRouter.route('/:id/feats').put(
    [body('feat').isArray().withMessage('feat must be an array')],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      try {
        await db_connect.collection('Characters').updateOne(
          { _id: ObjectId(req.params.id) },
          {
            $push: {
              feat: { $each: matchedData(req, { locations: ['body'] }).feat },
            },
          }
        );
        logger.info('Feats updated');
        res.json({ message: 'Feats updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update spells.
  characterRouter.route('/:id/spells').put(
    [
      body('spells').isArray().withMessage('spells must be an array'),
      body('spells.*.name').isString(),
      body('spells.*.level').isInt().toInt(),
      body('spells.*.damage').optional().isString(),
      body('spells.*.castingTime').optional().isString(),
      body('spells.*.range').optional().isString(),
      body('spells.*.duration').optional().isString(),
      body('spellPoints').optional().isInt().toInt(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      const { spells, spellPoints } = matchedData(req, {
        locations: ['body'],
        includeOptionals: true,
      });
      const update = { spells };
      if (typeof spellPoints === 'number') {
        update.spellPoints = spellPoints;
      }
      try {
        await db_connect.collection('Characters').updateOne(
          { _id: ObjectId(req.params.id) },
          { $set: update }
        );
        logger.info('Spells updated');
        res.json({ message: 'Spells updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update race.
  characterRouter.route('/:id/race').put(
    [body('race').isObject().withMessage('race must be an object')],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      const newRace = matchedData(req, { locations: ['body'] }).race;
      try {
        const character = await db_connect
          .collection('Characters')
          .findOne({ _id: ObjectId(req.params.id) });
        if (!character) {
          return res.status(404).json({ message: 'Character not found' });
        }

        const allowedSkillsSet = new Set(
          collectAllowedSkills(
            character.occupation,
            character.feat,
            newRace,
            character.background
          )
        );
        const allowedExpertiseSet = new Set(
          collectAllowedExpertise(
            character.occupation,
            character.feat,
            newRace,
            character.background
          )
        );
        const updatedSkills = { ...(character.skills || {}) };

        // Apply new race proficiencies
        if (newRace.skills) {
          Object.keys(newRace.skills).forEach((sk) => {
            if (!updatedSkills[sk]) updatedSkills[sk] = { ...skillFields[sk] };
            updatedSkills[sk].proficient = newRace.skills[sk].proficient;
            updatedSkills[sk].expertise = newRace.skills[sk].expertise || false;
          });
        }

        // Remove proficiencies no longer allowed
        Object.keys(updatedSkills).forEach((sk) => {
          if (!allowedSkillsSet.has(sk)) {
            updatedSkills[sk].proficient = false;
            updatedSkills[sk].expertise = false;
          }
        });

        const occupationPoints = Array.isArray(character.occupation)
          ? character.occupation.reduce(
              (sum, o) => sum + Number(o.proficiencyPoints || 0),
              0
            )
          : 0;
        const featPoints = countFeatProficiencies(character.feat);
        const racePoints = countRaceProficiencies(newRace);
        const backgroundPoints = countBackgroundProficiencies(character.background);
        const newProficiencyPoints =
          occupationPoints + featPoints + racePoints + backgroundPoints;
        const classExpertise = countClassExpertise(character.occupation);
        const featExpertise = countFeatExpertise(character.feat);
        const raceExpertise = countRaceExpertise(newRace);
        const backgroundExpertise = countBackgroundExpertise(character.background);
        const newExpertisePoints =
          classExpertise + featExpertise + raceExpertise + backgroundExpertise;

        await db_connect.collection('Characters').updateOne(
          { _id: ObjectId(req.params.id) },
          {
            $set: {
              race: newRace,
              skills: updatedSkills,
              allowedSkills: Array.from(allowedSkillsSet),
              allowedExpertise: Array.from(allowedExpertiseSet),
              proficiencyPoints: newProficiencyPoints,
              expertisePoints: newExpertisePoints,
              speed: newRace.speed || 0,
            },
          }
        );

        res.json({
          race: newRace,
          skills: updatedSkills,
          allowedSkills: Array.from(allowedSkillsSet),
          allowedExpertise: Array.from(allowedExpertiseSet),
          proficiencyPoints: newProficiencyPoints,
          expertisePoints: newExpertisePoints,
          speed: newRace.speed || 0,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update background.
  characterRouter.route('/:id/background').put(
    [body('background').isObject().withMessage('background must be an object')],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      const newBackground = matchedData(req, { locations: ['body'] }).background;
      try {
        const character = await db_connect
          .collection('Characters')
          .findOne({ _id: ObjectId(req.params.id) });
        if (!character) {
          return res.status(404).json({ message: 'Character not found' });
        }

        const allowedSkillsSet = new Set(
          collectAllowedSkills(
            character.occupation,
            character.feat,
            character.race,
            newBackground
          )
        );
        const allowedExpertiseSet = new Set(
          collectAllowedExpertise(
            character.occupation,
            character.feat,
            character.race,
            newBackground
          )
        );
        const updatedSkills = { ...(character.skills || {}) };

        if (newBackground.skills) {
          Object.keys(newBackground.skills).forEach((sk) => {
            if (!updatedSkills[sk]) updatedSkills[sk] = { ...skillFields[sk] };
            updatedSkills[sk].proficient = newBackground.skills[sk].proficient;
            updatedSkills[sk].expertise = newBackground.skills[sk].expertise || false;
          });
        }

        Object.keys(updatedSkills).forEach((sk) => {
          if (!allowedSkillsSet.has(sk)) {
            updatedSkills[sk].proficient = false;
            updatedSkills[sk].expertise = false;
          }
        });

        const occupationPoints = Array.isArray(character.occupation)
          ? character.occupation.reduce(
              (sum, o) => sum + Number(o.proficiencyPoints || 0),
              0
            )
          : 0;
        const featPoints = countFeatProficiencies(character.feat);
        const racePoints = countRaceProficiencies(character.race);
        const backgroundPoints = countBackgroundProficiencies(newBackground);
        const newProficiencyPoints =
          occupationPoints + featPoints + racePoints + backgroundPoints;
        const classExpertise = countClassExpertise(character.occupation);
        const featExpertise = countFeatExpertise(character.feat);
        const raceExpertise = countRaceExpertise(character.race);
        const backgroundExpertise = countBackgroundExpertise(newBackground);
        const newExpertisePoints =
          classExpertise + featExpertise + raceExpertise + backgroundExpertise;

        await db_connect.collection('Characters').updateOne(
          { _id: ObjectId(req.params.id) },
          {
            $set: {
              background: newBackground,
              skills: updatedSkills,
              allowedSkills: Array.from(allowedSkillsSet),
              allowedExpertise: Array.from(allowedExpertiseSet),
              proficiencyPoints: newProficiencyPoints,
              expertisePoints: newExpertisePoints,
            },
          }
        );

        res.json({
          background: newBackground,
          skills: updatedSkills,
          allowedSkills: Array.from(allowedSkillsSet),
          allowedExpertise: Array.from(allowedExpertiseSet),
          proficiencyPoints: newProficiencyPoints,
          expertisePoints: newExpertisePoints,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.use('/characters', characterRouter);
};

