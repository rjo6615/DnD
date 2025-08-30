const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const logger = require('../../utils/logger');

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
      res.json(result);
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

