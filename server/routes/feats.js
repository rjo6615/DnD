const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const { body, matchedData } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const { skillFields } = require('./fieldConstants');
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
      body('abilityIncreaseOptions.*').optional().isString().trim(),
      ...skillFields.map((field) => body(field).optional().isInt().toInt()),
      ...numericFeatFields.map((field) => body(field).optional().isInt().toInt()),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
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
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection("Characters").updateOne(id, {
        $set: { 'feat': req.body.feat }
      });
      logger.info("character feat updated");
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      next(err);
    }
  });

  router.use('/feats', featRouter);
};
