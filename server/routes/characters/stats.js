const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const logger = require('../../utils/logger');

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

  // This section will update stats.
  characterRouter.route('/update-stats/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection('Characters').updateOne(id, {
        $set: {
          str: req.body.str,
          dex: req.body.dex,
          con: req.body.con,
          int: req.body.int,
          wis: req.body.wis,
          cha: req.body.cha,
        },
      });
      logger.info('character stats updated');
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      next(err);
    }
  });

  router.use(characterRouter);
};

