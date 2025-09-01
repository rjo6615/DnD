const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const logger = require('../../utils/logger');
const { skillNames } = require('../fieldConstants');

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

  // This section will update occupations.
  characterRouter.route('/update-occupations/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;

    try {
      await db_connect.collection('Characters').updateOne(id, {
        $set: { occupation: req.body },
      });
      logger.info('Character occupations updated');
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  });

  router.use('/characters', characterRouter);
};

