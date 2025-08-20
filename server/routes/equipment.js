const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const { body } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

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
  equipmentRouter.route('/update-weapon/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection("Characters").updateOne(id, {
        $set: { 'weapon': req.body.weapon }
      });
      console.log("character weapon updated");
      res.send('user updated sucessfully');
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new weapon.
  equipmentRouter.route("/weapon/add").post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      campaign: req.body.campaign,
      weaponName: req.body.weaponName,
      enhancement: req.body.enhancement,
      damage: req.body.damage,
      critical: req.body.critical,
      weaponStyle: req.body.weaponStyle,
      range: req.body.range
    };
    try {
      const result = await db_connect.collection("Weapons").insertOne(myobj);
      response.json(result);
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
  equipmentRouter.route("/armor/add").post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      campaign: req.body.campaign,
      armorName: req.body.armorName,
      armorBonus: req.body.armorBonus,
      maxDex: req.body.maxDex,
      armorCheckPenalty: req.body.armorCheckPenalty
    };
    try {
      const result = await db_connect.collection("Armor").insertOne(myobj);
      response.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will update armors.
  equipmentRouter.route('/update-armor/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection("Characters").updateOne(id, {
        $set: { 'armor': req.body.armor }
      });
      console.log("character armor updated");
      res.send('user updated sucessfully');
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
  equipmentRouter.route("/item/add").post(
    [
      body('campaign').trim().notEmpty().withMessage('campaign is required'),
      body('itemName').trim().notEmpty().withMessage('itemName is required'),
    ],
    handleValidationErrors,
    async (req, response, next) => {
      const db_connect = req.db;
      const allowedFields = [
        'campaign',
        'itemName',
        'notes',
        'str',
        'dex',
        'con',
        'int',
        'wis',
        'cha',
        'appraise',
        'balance',
        'bluff',
        'climb',
        'concentration',
        'decipherScript',
        'diplomacy',
        'disableDevice',
        'disguise',
        'escapeArtist',
        'forgery',
        'gatherInfo',
        'handleAnimal',
        'heal',
        'hide',
        'intimidate',
        'jump',
        'listen',
        'moveSilently',
        'openLock',
        'ride',
        'search',
        'senseMotive',
        'sleightOfHand',
        'spot',
        'survival',
        'swim',
        'tumble',
        'useTech',
        'useRope',
      ];
      const myobj = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          myobj[field] = req.body[field];
        }
      });
      try {
        const result = await db_connect.collection('Items').insertOne(myobj);
        response.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will update items.
  equipmentRouter.route('/update-item/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection("Characters").updateOne(id, {
        $set: { 'item': req.body.item }
      });
      console.log("character item updated");
      res.send('user updated sucessfully');
    } catch (err) {
      next(err);
    }
  });

  router.use(equipmentRouter);
};
