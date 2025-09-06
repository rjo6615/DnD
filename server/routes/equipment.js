const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const { body, matchedData } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const { numericFields, skillNames } = require('./fieldConstants');

module.exports = (router) => {
  const equipmentRouter = express.Router();

  // Apply authentication to all equipment routes
  equipmentRouter.use(authenticateToken);

  const itemNumericFields = numericFields.filter(
    (field) =>
      !['age', 'height', 'weight', 'startStatTotal', 'health', 'tempHealth'].includes(field)
  );

  const skillBooleanValidators = skillNames.flatMap((skill) => [
    body(`skills.${skill}.proficient`).optional().isBoolean().toBoolean(),
    body(`skills.${skill}.expertise`).optional().isBoolean().toBoolean(),
  ]);

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
      body('name').trim().notEmpty().withMessage('name is required'),
      body('type').optional().isString().trim().toLowerCase(),
      body('category').trim().notEmpty().withMessage('category is required'),
      body('damage').trim().notEmpty().withMessage('damage is required'),
      body('properties').optional().isArray(),
      body('weight').optional().isFloat().toFloat(),
      body('cost').optional().isString().trim(),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Weapons').insertOne(myobj);
        const weapon = { _id: result.insertedId, ...myobj };
        response.json(weapon);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will delete a weapon.
  equipmentRouter.route('/weapon/:id').delete(async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const db_connect = req.db;
    try {
      const result = await db_connect
        .collection('Weapons')
        .deleteOne({ _id: ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Weapon not found' });
      }
      res.json({ acknowledged: true });
    } catch (err) {
      next(err);
    }
  });

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
      body('armorBonus').optional({ checkFalsy: true }).isInt().toInt(),
      body('maxDex').optional({ checkFalsy: true }).isInt().toInt(),
      body('armorCheckPenalty').optional({ checkFalsy: true }).isInt().toInt(),
      body('type').optional().isString().trim().toLowerCase(),
      body('category').optional().isString().trim().toLowerCase(),
      body('strength').optional().isInt().toInt(),
      body('stealth').optional().isBoolean().toBoolean(),
      body('weight').optional().isFloat().toFloat(),
      body('cost').optional().isString().trim(),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Armor').insertOne(myobj);
        const armor = { _id: result.insertedId, ...myobj };
        response.json(armor);
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

  // This section will delete an armor.
  equipmentRouter.route('/armor/:id').delete(async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const db_connect = req.db;
    try {
      const result = await db_connect
        .collection('Armor')
        .deleteOne({ _id: ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Armor not found' });
      }
      res.json({ acknowledged: true });
    } catch (err) {
      next(err);
    }
  });

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
      ...itemNumericFields.map((field) => body(field).optional().isInt().toInt()),
      ...skillBooleanValidators,
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
