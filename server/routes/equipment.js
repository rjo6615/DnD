const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const { body, matchedData } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const { numericFields, skillFields } = require('./fieldConstants');

module.exports = (router) => {
  const equipmentRouter = express.Router();

  // Apply authentication to all equipment routes
  equipmentRouter.use(authenticateToken);

  const itemFields = [
    ...numericFields.filter((field) =>
      !['age', 'height', 'weight', 'startStatTotal', 'health', 'tempHealth'].includes(field)
    ),
    ...skillFields,
  ];

  // Weapon Section

  // This section will get a list of all the weapons.
  equipmentRouter.route("/weapons/:campaign").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Weapons")
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will update weapons.
  equipmentRouter.route('/update-weapon/:id').put(
    [body('weapon').isArray().withMessage('weapon must be an array')],
    handleValidationErrors,
    async (req, res, next) => {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: 'Invalid ID' });
        }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { weapon } = matchedData(req, { locations: ['body'] });
      try {
        const result = await db_connect.collection('Characters').updateOne(id, {
          $set: { weapon },
        });
          if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Weapon not found' });
          }
        res.json({ message: 'Weapon updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will create a new weapon.
  equipmentRouter.route('/weapon/add').post(
    [
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('weaponName').trim().notEmpty().withMessage('weaponName is required'),
      body('enhancement').optional({ checkFalsy: true }).isInt().toInt(),
      body('range').optional({ checkFalsy: true }).isInt().toInt(),
      body('damage').optional().trim(),
      body('critical').optional().trim(),
      body('weaponStyle').optional().trim(),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Weapons').insertOne(myobj);
        response.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // Armor Section

  // This section will get a list of all the armor.
  equipmentRouter.route("/armor/:campaign").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Armor")
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new armor.
  equipmentRouter.route('/armor/add').post(
    [
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('armorName').trim().notEmpty().withMessage('armorName is required'),
      body('armorBonus').optional().isInt().toInt(),
      body('maxDex').optional().isInt().toInt(),
      body('armorCheckPenalty').optional().isInt().toInt(),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Armor').insertOne(myobj);
        response.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update armors.
  equipmentRouter.route('/update-armor/:id').put(
    [body('armor').isArray().withMessage('armor must be an array')],
    handleValidationErrors,
    async (req, res, next) => {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: 'Invalid ID' });
        }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { armor } = matchedData(req, { locations: ['body'] });
      try {
        const result = await db_connect.collection('Characters').updateOne(id, {
          $set: { armor },
        });
          if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Armor not found' });
          }
        res.json({ message: 'Armor updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  // Item Section

  // This section will get a list of all the items.
  equipmentRouter.route("/items/:campaign").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Items")
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new item.
  equipmentRouter.route('/item/add').post(
    [
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('itemName').trim().notEmpty().withMessage('itemName is required'),
      body('notes').optional().trim(),
      ...itemFields.map((field) => body(field).optional().isInt().toInt()),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Items').insertOne(myobj);
        response.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update items.
  equipmentRouter.route('/update-item/:id').put(
    [body('item').isArray().withMessage('item must be an array')],
    handleValidationErrors,
    async (req, res, next) => {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: 'Invalid ID' });
        }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { item } = matchedData(req, { locations: ['body'] });
      try {
        const result = await db_connect.collection('Characters').updateOne(id, {
          $set: { item },
        });
          if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Item not found' });
          }
        res.json({ message: 'Item updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  router.use('/equipment', equipmentRouter);
};
