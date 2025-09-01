const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { numericFields, skillFields, skillNames } = require('../fieldConstants');

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

  // This section will get a single character by id
  characterRouter.route('/:id').get(async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    try {
      const db_connect = req.db;
      const myquery = { _id: ObjectId(req.params.id) };
      const result = await db_connect
        .collection('Characters')
        .findOne(myquery);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will get a list of all the characters.
  characterRouter.route('/select').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection('Characters')
        .find({})
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new character.
  // Includes numeric stats like initiative, AC, speed, passive scores, and HP bonuses.
  const numericCharacterFields = [...numericFields];

  characterRouter.post(
    '/add',
    [
      body('token').trim().notEmpty().withMessage('token is required'),
      body('characterName').trim().notEmpty().withMessage('characterName is required'),
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('occupation').optional().isArray(),
      body('occupation.*.Level').isInt().toInt(),
      body('feat').optional().isArray(),
      body('weapon').optional().isArray(),
      body('armor').optional().isArray(),
      body('item').optional().isArray(),
      body('sex').optional().trim(),
      body('diceColor').optional().trim(),
      ...numericCharacterFields.map((field) => body(field).optional().isInt().toInt()),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });

      // initialize skills structure with proficiency/expertise flags if not provided
      if (!myobj.skills) {
        // initialize default proficiency/expertise structure for all skills
        myobj.skills = {};
        skillNames.forEach((skill) => {
          myobj.skills[skill] = { ...skillFields[skill] };
        });
      }

      try {
        const result = await db_connect.collection('Characters').insertOne(myobj);
        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will delete a character
  characterRouter.route('/delete-character/:id').delete(async (req, response, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return response.status(400).json({ message: 'Invalid ID' });
    }
    const db_connect = req.db;
    const myquery = { _id: ObjectId(req.params.id) };
    try {
      const obj = await db_connect.collection('Characters').deleteOne(myquery);
      logger.info('1 character deleted');
      response.json(obj);
    } catch (err) {
      next(err);
    }
  });

  // This section will update level.
  characterRouter.route('/update-level/:id').put(
    [
      body('level').isInt().withMessage('level must be an integer').toInt(),
      body('health').isInt().withMessage('health must be an integer').toInt(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      const selectedOccupation = req.body.selectedOccupation;
      const { level, health } = matchedData(req, { locations: ['body'] });

      const updateOperation = {
        $set: {
          'occupation.$.Level': level,
          health,
        },
      };

      try {
        const result = await db_connect.collection('Characters').updateOne(
          {
            _id: ObjectId(req.params.id),
            occupation: {
              $elemMatch: {
                Occupation: selectedOccupation,
              },
            },
          },
          updateOperation
        );
        if (result.modifiedCount !== 0) {
          logger.info(`Character updated for Occupation: ${selectedOccupation}`);
          res.json({ message: 'Update complete' });
        }
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update dice color.
  characterRouter.route('/update-dice-color/:id').put(
    [body('diceColor').isString().withMessage('diceColor must be a string').trim()],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { diceColor } = matchedData(req, { locations: ['body'] });
      try {
        await db_connect.collection('Characters').updateOne(id, {
          $set: { diceColor },
        });
        logger.info('Dice Color updated');
        res.json({ message: 'User updated successfully' });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update feats.
  characterRouter.route('/:id/feats').put(
    [body('feat').isArray().withMessage('feat must be an array')],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const db_connect = req.db;
      try {
        await db_connect.collection('Characters').updateOne(
          { _id: ObjectId(req.params.id) },
          {
            $push: {
              feat: { $each: matchedData(req, { locations: ['body'] }).feat },
            },
          }
        );
        logger.info('Feats updated');
        res.json({ message: 'Feats updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  router.use('/characters', characterRouter);
};

