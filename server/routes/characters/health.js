const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

  // This section will update tempHealth.
  characterRouter.route('/update-temphealth/:id').put(
    [body('tempHealth').isInt().withMessage('tempHealth must be an integer').toInt()],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { tempHealth } = matchedData(req, { locations: ['body'] });
      try {
        await db_connect.collection('Characters').updateOne(id, {
          $set: { tempHealth },
        });
        logger.info('character tempHealth updated');
        res.send('user updated sucessfully');
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update health and stats.
  characterRouter.route('/update-health/:id').put(
    [
      body('health').isInt().withMessage('health must be an integer').toInt(),
      body('str').isInt().toInt(),
      body('dex').isInt().toInt(),
      body('con').isInt().toInt(),
      body('int').isInt().toInt(),
      body('wis').isInt().toInt(),
      body('cha').isInt().toInt(),
      body('startStatTotal').isInt().toInt(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const fields = matchedData(req, { locations: ['body'] });

      try {
        await db_connect.collection('Characters').updateOne(id, {
          $set: fields,
        });
        logger.info('Character health and stats updated');
        res.send('User updated successfully');
      } catch (error) {
        logger.error(error);
        res.status(500).send('Server error');
      }
    }
  );

  router.use(characterRouter);
};

