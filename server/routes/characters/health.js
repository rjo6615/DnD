const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const logger = require('../../utils/logger');

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

  // This section will update tempHealth.
  characterRouter.route('/update-temphealth/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection('Characters').updateOne(id, {
        $set: { tempHealth: req.body.tempHealth },
      });
      logger.info('character tempHealth updated');
      res.send('user updated sucessfully');
    } catch (err) {
      next(err);
    }
  });

  // This section will update health and stats.
  characterRouter.route('/update-health/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;

    try {
      await db_connect.collection('Characters').updateOne(id, {
        $set: {
          health: req.body.health,
          str: req.body.str,
          dex: req.body.dex,
          con: req.body.con,
          int: req.body.int,
          wis: req.body.wis,
          cha: req.body.cha,
          startStatTotal: req.body.startStatTotal,
        },
      });
      logger.info('Character health and stats updated');
      res.send('User updated successfully');
    } catch (error) {
      logger.error(error);
      res.status(500).send('Server error');
    }
  });

  router.use(characterRouter);
};

