const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const logger = require('../utils/logger');
const { body, matchedData } = require('express-validator');
const handleValidationErrors = require('../middleware/validation');

module.exports = (router) => {
  const featRouter = express.Router();

  // Apply authentication to all feat routes
  featRouter.use(authenticateToken);

  // This section will get a list of all the feats.
  featRouter.route("/feats").get(async (req, res, next) => {
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
  featRouter.route("/feat/add").post(
    [
      body('featName').trim().notEmpty().withMessage('featName is required'),
      body('notes').optional().trim(),
      body('appraise').optional().isInt().toInt(),
      body('balance').optional().isInt().toInt(),
      body('bluff').optional().isInt().toInt(),
      body('climb').optional().isInt().toInt(),
      body('concentration').optional().isInt().toInt(),
      body('decipherScript').optional().isInt().toInt(),
      body('diplomacy').optional().isInt().toInt(),
      body('disableDevice').optional().isInt().toInt(),
      body('disguise').optional().isInt().toInt(),
      body('escapeArtist').optional().isInt().toInt(),
      body('forgery').optional().isInt().toInt(),
      body('gatherInfo').optional().isInt().toInt(),
      body('handleAnimal').optional().isInt().toInt(),
      body('heal').optional().isInt().toInt(),
      body('hide').optional().isInt().toInt(),
      body('intimidate').optional().isInt().toInt(),
      body('jump').optional().isInt().toInt(),
      body('listen').optional().isInt().toInt(),
      body('moveSilently').optional().isInt().toInt(),
      body('openLock').optional().isInt().toInt(),
      body('ride').optional().isInt().toInt(),
      body('search').optional().isInt().toInt(),
      body('senseMotive').optional().isInt().toInt(),
      body('sleightOfHand').optional().isInt().toInt(),
      body('spot').optional().isInt().toInt(),
      body('survival').optional().isInt().toInt(),
      body('swim').optional().isInt().toInt(),
      body('tumble').optional().isInt().toInt(),
      body('useTech').optional().isInt().toInt(),
      body('useRope').optional().isInt().toInt(),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection("Feats").insertOne(myobj);
        response.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update feats.
  featRouter.route('/update-feat/:id').put(
    [
      body('featName').trim().notEmpty().withMessage('featName is required'),
      body('notes').optional().trim(),
      body('appraise').optional().isInt().toInt(),
      body('balance').optional().isInt().toInt(),
      body('bluff').optional().isInt().toInt(),
      body('climb').optional().isInt().toInt(),
      body('concentration').optional().isInt().toInt(),
      body('decipherScript').optional().isInt().toInt(),
      body('diplomacy').optional().isInt().toInt(),
      body('disableDevice').optional().isInt().toInt(),
      body('disguise').optional().isInt().toInt(),
      body('escapeArtist').optional().isInt().toInt(),
      body('forgery').optional().isInt().toInt(),
      body('gatherInfo').optional().isInt().toInt(),
      body('handleAnimal').optional().isInt().toInt(),
      body('heal').optional().isInt().toInt(),
      body('hide').optional().isInt().toInt(),
      body('intimidate').optional().isInt().toInt(),
      body('jump').optional().isInt().toInt(),
      body('listen').optional().isInt().toInt(),
      body('moveSilently').optional().isInt().toInt(),
      body('openLock').optional().isInt().toInt(),
      body('ride').optional().isInt().toInt(),
      body('search').optional().isInt().toInt(),
      body('senseMotive').optional().isInt().toInt(),
      body('sleightOfHand').optional().isInt().toInt(),
      body('spot').optional().isInt().toInt(),
      body('survival').optional().isInt().toInt(),
      body('swim').optional().isInt().toInt(),
      body('tumble').optional().isInt().toInt(),
      body('useTech').optional().isInt().toInt(),
      body('useRope').optional().isInt().toInt(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const feat = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection("Feats").updateOne(id, { $set: feat });
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Feat not found' });
        }
        logger.info("feat updated");
        res.json({ message: 'Feat updated successfully' });
      } catch (err) {
        next(err);
      }
    }
  );

  router.use(featRouter);
};
