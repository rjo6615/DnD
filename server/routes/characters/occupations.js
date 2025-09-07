const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const logger = require('../../utils/logger');
const { skillNames } = require('../fieldConstants');
const { applyMulticlass } = require('../../utils/multiclass');
const classes = require('../../data/classes');

module.exports = (router) => {
  const characterRouter = express.Router();

  // This section will get a list of all the occupations.
  characterRouter.route('/occupations').get((req, res, next) => {
    try {
      const result = Object.values(classes).map((cls) => {
        const skills = {};
        skillNames.forEach((skill) => {
          skills[skill] = { proficient: false, expertise: false };
        });
        return {
          name: cls.name,
          hitDie: cls.hitDie,
          proficiencies: cls.proficiencies,
          casterProgression: cls.casterProgression,
          skills,
        };
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Apply authentication to all character routes after occupations
  characterRouter.use(authenticateToken);

  // Apply a new occupation to a character (multiclassing)
  characterRouter.route('/multiclass/:id').post(async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const { newOccupation } = req.body || {};
    if (typeof newOccupation !== 'string' || !newOccupation.trim()) {
      return res.status(400).json({ message: 'newOccupation is required' });
    }
    try {
      const result = await applyMulticlass(req.params.id, newOccupation);
      if (!result.allowed) {
        return res.status(400).json({ message: result.message });
      }
      logger.info('Character multiclass applied');
      res.json(result);
    } catch (error) {
      logger.error(error);
      next(error);
    }
  });

  router.use('/characters', characterRouter);
};

