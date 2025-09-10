const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { numericFields, skillFields, skillNames } = require('../fieldConstants');
const proficiencyBonus = require('../../utils/proficiency');
const collectAllowedSkills = require('../../utils/collectAllowedSkills');
const collectAllowedExpertise = require('../../utils/collectAllowedExpertise');

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
        return {
          ...char,
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
      ...numericCharacterFields.map((field) => body(field).optional().isInt().toInt()),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });

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
  characterRouter.route('/delete-character/:id').delete(async (req, response, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return response.status(400).json({ message: 'Invalid ID' });
    }
    const db_connect = req.db;
    const myquery = { _id: ObjectId(req.params.id) };
    try {
      const obj = await db_connect.collection('Characters').deleteOne(myquery);
      logger.info('1 character deleted');
      response.json(obj);
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
        await db_connect.collection('Characters').updateOne(id, {
          $set: { diceColor },
        });
        logger.info('Dice Color updated');
        res.json({ message: 'User updated successfully' });
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
      body('spells.*.classes').optional().isArray(),
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

