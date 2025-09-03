const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const { body, matchedData } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const { skillNames } = require('./fieldConstants');
const logger = require('../utils/logger');

module.exports = (router) => {
  const featRouter = express.Router();

  const numericFeatFields = [
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha',
    'initiative',
    'ac',
    'speed',
    'hpMaxBonus',
    'hpMaxBonusPerLevel',
  ];

  const collectAllowedSkills = (occupation = [], feat = []) => {
    const allowed = new Set();
    if (Array.isArray(occupation)) {
      occupation.forEach((occ) => {
        if (occ && occ.skills && typeof occ.skills === 'object') {
          Object.keys(occ.skills).forEach((skill) => {
            if (occ.skills[skill] && occ.skills[skill].proficient) {
              allowed.add(skill);
            }
          });
        }
      });
    }
    if (Array.isArray(feat)) {
      feat.forEach((ft) => {
        if (ft && ft.skills && typeof ft.skills === 'object') {
          Object.keys(ft.skills).forEach((skill) => {
            if (ft.skills[skill] && ft.skills[skill].proficient) {
              allowed.add(skill);
            }
          });
        }
      });
    }
    return Array.from(allowed);
  };

  const extractFeatSkills = (feats = []) => {
    const skills = {};
    if (Array.isArray(feats)) {
      feats.forEach((ft) => {
        if (ft && ft.skills && typeof ft.skills === 'object') {
          Object.keys(ft.skills).forEach((sk) => {
            const info = ft.skills[sk];
            if (info && (info.proficient || info.expertise)) {
              skills[sk] = {
                proficient: !!info.proficient,
                expertise: !!info.expertise,
              };
            }
          });
        }
      });
    }
    return skills;
  };

  // Apply authentication to all feat routes
  featRouter.use(authenticateToken);

  // This section will get a list of all the feats.
  featRouter.route('/').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Feats")
        .find({})
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new feat.
  featRouter.post(
    '/add',
    [
      body('featName').trim().notEmpty().withMessage('featName is required'),
      body('notes').optional().trim(),
      body('abilityIncreaseOptions').optional().isArray(),
      body('abilityIncreaseOptions.*.abilities').isArray(),
      body('abilityIncreaseOptions.*.abilities.*').isString().trim(),
      body('abilityIncreaseOptions.*.amount').isInt().toInt(),
      ...skillNames.flatMap((skill) => [
        body(`skills.${skill}.proficient`).optional().isBoolean().toBoolean(),
        body(`skills.${skill}.expertise`).optional().isBoolean().toBoolean(),
      ]),
      ...numericFeatFields.map((field) => body(field).optional().isInt().toInt()),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const rawData = matchedData(req, {
        locations: ['body'],
        includeOptionals: true,
      });
      const myobj = { ...rawData };
      if (rawData.abilityIncreaseOptions) {
        myobj.abilityIncreaseOptions = rawData.abilityIncreaseOptions.map(
          ({ abilities, amount }) => ({ abilities, amount })
        );
      }
      try {
        const result = await db_connect.collection('Feats').insertOne(myobj);
        response.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update feats.
  featRouter.route('/update/:id').put(async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    const newFeats = Array.isArray(req.body.feat) ? req.body.feat : [];
    const incomingSkills = req.body.skills || {};
    const featName = req.body.featName;

    if (featName && newFeats.length) {
      const featIndex = newFeats.findIndex((f) => f.featName === featName);
      if (featIndex >= 0) {
        newFeats[featIndex].skills = incomingSkills;
      }
    }

    try {
      const character = await db_connect.collection('Characters').findOne(id);
      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const prevFeatSkills = extractFeatSkills(character.feat);
      const newFeatSkills = extractFeatSkills(newFeats);
      const allowedSkillsSet = new Set(
        collectAllowedSkills(character.occupation, newFeats)
      );

      const updatedSkills = { ...(character.skills || {}) };

      Object.entries(newFeatSkills).forEach(([skill, info]) => {
        if (!updatedSkills[skill]) updatedSkills[skill] = {};
        updatedSkills[skill].proficient = info.proficient;
        updatedSkills[skill].expertise = info.expertise;
      });

      Object.keys(prevFeatSkills).forEach((skill) => {
        if (!allowedSkillsSet.has(skill) && updatedSkills[skill]) {
          updatedSkills[skill].proficient = false;
          updatedSkills[skill].expertise = false;
        }
      });

      const occupationPoints = Array.isArray(character.occupation)
        ? character.occupation.reduce(
            (sum, o) => sum + Number(o.proficiencyPoints || 0),
            0
          )
        : 0;
      const featPointCount = Object.values(newFeatSkills).filter(
        (info) => info.proficient
      ).length;
      const newProficiencyPoints = occupationPoints + featPointCount;

      await db_connect.collection('Characters').updateOne(id, {
        $set: {
          feat: newFeats,
          skills: updatedSkills,
          allowedSkills: Array.from(allowedSkillsSet),
          proficiencyPoints: newProficiencyPoints,
        },
      });
      logger.info('character feat updated');
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      next(err);
    }
  });

  router.use('/feats', featRouter);
};
