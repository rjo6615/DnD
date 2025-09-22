const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const { body, matchedData } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const { armors: armorData } = require('../data/armor');
const {
  categories: accessoryCategories,
  slotKeys: ACCESSORY_SLOT_KEYS,
} = require('../data/accessories');
const {
  EQUIPMENT_SLOT_KEYS,
  normalizeEquipmentMap,
} = require('../constants/equipmentSlots');

const SLOT_KEY_LOOKUP = EQUIPMENT_SLOT_KEYS.reduce((lookup, key) => {
  const normalized = key.toLowerCase();
  lookup[normalized] = key;
  lookup[normalized.replace(/[\s_-]+/g, '')] = key;
  return lookup;
}, {});

const getSlotString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && typeof value.key === 'string') {
    return value.key;
  }
  return '';
};

const normalizeSlotAssignment = (value) => {
  const slotString = getSlotString(value);
  if (!slotString) return '';
  const lower = slotString.trim().toLowerCase();
  if (!lower) return '';
  if (SLOT_KEY_LOOKUP[lower]) {
    return SLOT_KEY_LOOKUP[lower];
  }
  const compact = lower.replace(/[\s_-]+/g, '');
  if (SLOT_KEY_LOOKUP[compact]) {
    return SLOT_KEY_LOOKUP[compact];
  }
  return '';
};

const resolveSlotAssignment = (entry) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { assigned: false, slot: '' };
  }
  const directKeys = ['slot', 'equipmentSlot', 'equippedSlot', 'assignedSlot'];
  for (const key of directKeys) {
    const normalized = normalizeSlotAssignment(entry[key]);
    if (normalized) {
      return { assigned: true, slot: normalized };
    }
  }
  return { assigned: false, slot: '' };
};

const isTruthyEquipFlag = (value) => value === true || value === 'true';

const hasExplicitEquipFlag = (entry) => {
  if (!entry || typeof entry !== 'object') return false;
  const equipFlags = ['equipped', 'isEquipped', 'equippedFlag', 'equippedStatus'];
  return equipFlags.some((flag) => isTruthyEquipFlag(entry[flag]));
};

const validateBonusObject = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('must be an object');
  }
  for (const v of Object.values(value)) {
    if (typeof v !== 'number') {
      throw new Error('values must be numbers');
    }
  }
  return true;
};

const validateEquipmentMap = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('equipment must be an object');
  }

  const invalidKeys = Object.keys(value).filter(
    (slot) => !EQUIPMENT_SLOT_KEYS.includes(slot)
  );

  if (invalidKeys.length > 0) {
    throw new Error(`invalid equipment slots: ${invalidKeys.join(', ')}`);
  }

  for (const entry of Object.values(value)) {
    if (entry === null) continue;
    if (typeof entry === 'string') continue;
    if (typeof entry !== 'object') {
      throw new Error('slot assignments must be objects or null');
    }
    const hasName =
      typeof entry.name === 'string' ||
      typeof entry.displayName === 'string' ||
      typeof entry.title === 'string';
    if (!hasName) {
      throw new Error('slot assignments must include a name');
    }
  }

  return true;
};

const ACCESSORY_SLOT_SET = new Set(ACCESSORY_SLOT_KEYS);

const normalizeAccessorySlots = (slots = []) => {
  if (!Array.isArray(slots)) {
    return [];
  }
  const unique = Array.from(
    new Set(slots.filter((slot) => ACCESSORY_SLOT_SET.has(slot)))
  );
  return unique.sort(
    (a, b) => ACCESSORY_SLOT_KEYS.indexOf(a) - ACCESSORY_SLOT_KEYS.indexOf(b)
  );
};

module.exports = (router) => {
  const equipmentRouter = express.Router();

  // Apply authentication to all equipment routes
  equipmentRouter.use(authenticateToken);

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
      // Accept numeric cost values
      body('cost').optional().isFloat().toFloat(),
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
      body('type').optional().isString().trim().toLowerCase(),
      body('category').optional().isString().trim().toLowerCase(),
      body('slot')
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isIn(EQUIPMENT_SLOT_KEYS)
        .withMessage('slot must be a valid equipment slot'),
      body('equipmentSlot')
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isIn(EQUIPMENT_SLOT_KEYS)
        .withMessage('equipmentSlot must be a valid equipment slot'),
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
        const charDoc = await db_connect
          .collection('Characters')
          .findOne(id, { projection: { str: 1, campaign: 1 } });
        if (!charDoc) {
          return res.status(404).json({ message: 'Armor not found' });
        }

        const strengthMap = {};
        Object.entries(armorData).forEach(([key, a]) => {
          if (a.strength != null) {
            strengthMap[key.toLowerCase()] = a.strength;
            strengthMap[a.name.toLowerCase()] = a.strength;
          }
        });

        const customArmors = await db_connect
          .collection('Armor')
          .find({ campaign: charDoc.campaign })
          .toArray();
        customArmors.forEach((a) => {
          const name = String(a.name || a.armorName || '').toLowerCase();
          if (name && a.strength != null) {
            strengthMap[name] = a.strength;
          }
        });

        const charStrength = Number(charDoc?.str);
        const canCompareStrength = Number.isFinite(charStrength);
        const warnings = [];

        for (const entry of armor) {
          const entryObject =
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? entry
              : null;
          const { assigned, slot } = resolveSlotAssignment(entryObject);
          const equipFlag = hasExplicitEquipFlag(entryObject);
          if (!assigned && !equipFlag) {
            continue;
          }

          const name =
            typeof entry === 'string'
              ? entry
              : entryObject?.displayName ||
                entryObject?.name ||
                entryObject?.armorName ||
                entryObject?.title;
          if (!name) continue;
          const normalizedName = String(name);
          const required = strengthMap[normalizedName.toLowerCase()];
          if (required != null && canCompareStrength && charStrength < required) {
            warnings.push({
              type: 'strengthRequirement',
              name: normalizedName,
              slot: slot || null,
              required,
              actual: charStrength,
              message: `${normalizedName} requires strength ${required} to equip.`,
            });
          }
        }

        const result = await db_connect.collection('Characters').updateOne(id, {
          $set: { armor },
        });
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Armor not found' });
        }
        if (warnings.length > 0) {
          return res.json({ message: 'Armor updated', warnings });
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
  equipmentRouter.route('/items/:campaign').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection('Items')
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new item.
  equipmentRouter.route('/items').post(
    [
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('name').trim().notEmpty().withMessage('name is required'),
      body('category').trim().notEmpty().withMessage('category is required'),
      body('weight').isFloat().withMessage('weight must be a number').toFloat(),
      body('cost').trim().notEmpty().withMessage('cost is required'),
      body('notes').optional().trim(),
      body('statBonuses').optional().custom(validateBonusObject),
      body('skillBonuses').optional().custom(validateBonusObject),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Items').insertOne(myobj);
        const item = { _id: result.insertedId, ...myobj };
        res.json(item);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update an item.
  equipmentRouter.route('/items/:id').put(
    [
      body('name').optional().trim().notEmpty(),
      body('category').optional().trim().notEmpty(),
      body('weight').optional().isFloat().toFloat(),
      body('cost').optional().trim().notEmpty(),
      body('notes').optional().trim(),
      body('statBonuses').optional().custom(validateBonusObject),
      body('skillBonuses').optional().custom(validateBonusObject),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const updates = matchedData(req, { locations: ['body'], includeOptionals: true });
      try {
        const result = await db_connect.collection('Items').updateOne(id, {
          $set: updates,
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

  // This section will delete an item.
  equipmentRouter.route('/items/:id').delete(async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const db_connect = req.db;
    try {
      const result = await db_connect
        .collection('Items')
        .deleteOne({ _id: ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json({ acknowledged: true });
    } catch (err) {
      next(err);
    }
  });

  // Accessory Section

  equipmentRouter.route('/accessories/:campaign').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection('Accessories')
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  equipmentRouter.route('/accessories').post(
    [
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('name').trim().notEmpty().withMessage('name is required'),
      body('category')
        .trim()
        .notEmpty()
        .withMessage('category is required')
        .customSanitizer((value) => value.toLowerCase())
        .isIn(accessoryCategories)
        .withMessage('category must be a valid accessory category'),
      body('targetSlots')
        .isArray({ min: 1 })
        .withMessage('targetSlots must be a non-empty array')
        .custom((slots) => {
          const invalid = slots.filter((slot) => !ACCESSORY_SLOT_SET.has(slot));
          if (invalid.length > 0) {
            throw new Error(`invalid target slots: ${invalid.join(', ')}`);
          }
          return true;
        }),
      body('rarity').optional().isString().trim(),
      body('weight').optional().isFloat().toFloat(),
      body('cost').optional().isString().trim(),
      body('notes').optional().isString().trim(),
      body('statBonuses').optional().custom(validateBonusObject),
      body('skillBonuses').optional().custom(validateBonusObject),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const db_connect = req.db;
      const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
      myobj.targetSlots = normalizeAccessorySlots(myobj.targetSlots);
      try {
        const result = await db_connect.collection('Accessories').insertOne(myobj);
        const accessory = { _id: result.insertedId, ...myobj };
        res.json(accessory);
      } catch (err) {
        next(err);
      }
    }
  );

  equipmentRouter.route('/accessories/:id').put(
    [
      body('name').optional().trim().notEmpty(),
      body('category')
        .optional()
        .isString()
        .trim()
        .customSanitizer((value) => value.toLowerCase())
        .isIn(accessoryCategories)
        .withMessage('category must be a valid accessory category'),
      body('targetSlots')
        .optional()
        .isArray({ min: 1 })
        .withMessage('targetSlots must be a non-empty array when provided')
        .custom((slots) => {
          const invalid = slots.filter((slot) => !ACCESSORY_SLOT_SET.has(slot));
          if (invalid.length > 0) {
            throw new Error(`invalid target slots: ${invalid.join(', ')}`);
          }
          return true;
        }),
      body('rarity').optional().isString().trim(),
      body('weight').optional().isFloat().toFloat(),
      body('cost').optional().isString().trim(),
      body('notes').optional().isString().trim(),
      body('statBonuses').optional().custom(validateBonusObject),
      body('skillBonuses').optional().custom(validateBonusObject),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const updates = matchedData(req, { locations: ['body'], includeOptionals: true });
      if (updates.targetSlots) {
        updates.targetSlots = normalizeAccessorySlots(updates.targetSlots);
      }
      try {
        const result = await db_connect.collection('Accessories').updateOne(id, {
          $set: updates,
        });
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Accessory not found' });
        }
        res.json({ message: 'Accessory updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  equipmentRouter.route('/accessories/:id').delete(async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const db_connect = req.db;
    try {
      const result = await db_connect
        .collection('Accessories')
        .deleteOne({ _id: ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Accessory not found' });
      }
      res.json({ acknowledged: true });
    } catch (err) {
      next(err);
    }
  });

  // This section will update items on a character.
  equipmentRouter.route('/update-item/:id').put(
    [
      body('item').isArray().withMessage('item must be an array'),
      body('item.*').isObject().withMessage('each item must be an object'),
      body('item.*.name').trim().notEmpty().withMessage('name is required'),
      body('item.*.category').optional().isString().trim(),
      body('item.*.weight').optional({ checkFalsy: true }).isFloat().toFloat(),
      body('item.*.cost').optional().isString().trim(),
      body('item.*.notes').optional().isString().trim(),
      body('item.*.statBonuses').optional().custom(validateBonusObject),
      body('item.*.skillBonuses').optional().custom(validateBonusObject),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { item } = matchedData(req, { locations: ['body'], includeOptionals: true });
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

  equipmentRouter.route('/update-accessories/:id').put(
    [
      body('accessories')
        .isArray()
        .withMessage('accessories must be an array'),
      body('accessories.*')
        .isObject()
        .withMessage('each accessory must be an object'),
      body('accessories.*.name')
        .trim()
        .notEmpty()
        .withMessage('name is required'),
      body('accessories.*.category').optional().isString().trim(),
      body('accessories.*.targetSlots')
        .optional()
        .isArray()
        .withMessage('targetSlots must be an array when provided')
        .custom((slots) => {
          const invalid = slots.filter((slot) => !ACCESSORY_SLOT_SET.has(slot));
          if (invalid.length > 0) {
            throw new Error(`invalid target slots: ${invalid.join(', ')}`);
          }
          return true;
        }),
      body('accessories.*.rarity').optional().isString().trim(),
      body('accessories.*.weight')
        .optional({ checkFalsy: true })
        .isFloat()
        .toFloat(),
      body('accessories.*.cost').optional().isString().trim(),
      body('accessories.*.notes').optional().isString().trim(),
      body('accessories.*.statBonuses')
        .optional()
        .custom(validateBonusObject),
      body('accessories.*.skillBonuses')
        .optional()
        .custom(validateBonusObject),
      body('accessories.*.owned').optional().isBoolean().toBoolean(),
      body('accessories.*.ownedCount').optional().isInt().toInt(),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { accessories } = matchedData(req, {
        locations: ['body'],
        includeOptionals: true,
      });
      const normalizedAccessories = accessories.map((accessory) => {
        if (accessory.targetSlots) {
          return {
            ...accessory,
            targetSlots: normalizeAccessorySlots(accessory.targetSlots),
          };
        }
        return accessory;
      });
      try {
        const result = await db_connect.collection('Characters').updateOne(id, {
          $set: {
            accessories: normalizedAccessories,
            accessory: normalizedAccessories,
          },
        });
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Accessory not found' });
        }
        res.json({ message: 'Accessories updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  equipmentRouter.route('/update-equipment/:id').put(
    [body('equipment').custom(validateEquipmentMap)],
    handleValidationErrors,
    async (req, res, next) => {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const id = { _id: ObjectId(req.params.id) };
      const db_connect = req.db;
      const { equipment } = matchedData(req, {
        locations: ['body'],
        includeOptionals: true,
      });
      try {
        const normalized = normalizeEquipmentMap(equipment);
        const result = await db_connect.collection('Characters').updateOne(id, {
          $set: { equipment: normalized },
        });
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Equipment not found' });
        }
        res.json({ message: 'Equipment updated', equipment: normalized });
      } catch (err) {
        next(err);
      }
    }
  );

  router.use('/equipment', equipmentRouter);
};
