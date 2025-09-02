const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const logger = require('../../utils/logger');
const { skillNames } = require('../fieldConstants');
const { applyMulticlass } = require('../../utils/multiclass');

module.exports = (router) => {
  const characterRouter = express.Router();

  // This section will get a list of all the occupations.
  characterRouter.route('/occupations').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection('Occupations')
        .find({})
        .toArray();

      const transformed = result.map((doc) => {
        const skills = {};
        skillNames.forEach((skill) => {
          const rank = doc[skill];
          let proficient = false;
          let expertise = false;
          if (typeof rank === 'number') {
            proficient = rank > 0;
            expertise = rank > 1;
            delete doc[skill];
          } else if (doc.skills && doc.skills[skill]) {
            ({ proficient = false, expertise = false } = doc.skills[skill]);
          }
          skills[skill] = { proficient, expertise };
        });
        delete doc.skillMod;
        return { ...doc, skills };
      });

      res.json(transformed);
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

