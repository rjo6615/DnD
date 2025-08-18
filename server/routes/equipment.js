const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');

module.exports = (router) => {
  const equipmentRouter = express.Router();

  // Apply authentication to all equipment routes
  equipmentRouter.use(authenticateToken);

  // ----------------------------------------------------Weapon Section----------------------------------------------------

  // This section will get a list of all the weapons.
  equipmentRouter.route("/weapons/:campaign").get(function (req, res, next) {
    let db_connect = req.db;
    db_connect
      .collection("Weapons")
      .find({ campaign: req.params.campaign })
      .toArray(function (err, result) {
        if (err) return next(err);
        res.json(result);
      });
  });

  // This section will update weapons.
  equipmentRouter.route('/update-weapon/:id').put((req, res, next) => {
    let id = { _id: ObjectId(req.params.id) };
    let db_connect = req.db;
    db_connect.collection("Characters").updateOne(id, {$set:{
    'weapon': req.body.weapon
  }}, (err, result) => {
      if (err) { return next(err); }
      console.log("character weapon updated");
      res.send('user updated sucessfully');
    });
  });

  // This section will create a new weapon.
  equipmentRouter.route("/weapon/add").post(function  (req, response, next) {
    let db_connect = req.db;
    let myobj = {
    campaign: req.body.campaign,
    weaponName: req.body.weaponName,
    enhancement: req.body.enhancement,
    damage: req.body.damage,
    critical: req.body.critical,
    weaponStyle: req.body.weaponStyle,
    range: req.body.range
    };
    db_connect.collection("Weapons").insertOne(myobj, function (err, res) {
      if (err) return next(err);
      response.json(res);
    });
  });

  // -----------------------------------------------------Armor Section--------------------------------------------------------

  // This section will get a list of all the armor.
  equipmentRouter.route("/armor/:campaign").get(function (req, res, next) {
    let db_connect = req.db;
    db_connect
      .collection("Armor")
      .find({ campaign: req.params.campaign })
      .toArray(function (err, result) {
        if (err) return next(err);
        res.json(result);
      });
  });

  // This section will create a new armor.
  equipmentRouter.route("/armor/add").post(function  (req, response, next) {
    let db_connect = req.db;
    let myobj = {
    campaign: req.body.campaign,
    armorName: req.body.armorName,
    armorBonus: req.body.armorBonus,
    maxDex: req.body.maxDex,
    armorCheckPenalty: req.body.armorCheckPenalty
    };
    db_connect.collection("Armor").insertOne(myobj, function (err, res) {
      if (err) return next(err);
      response.json(res);
    });
  });

  // This section will update armors.
  equipmentRouter.route('/update-armor/:id').put((req, res, next) => {
    let id = { _id: ObjectId(req.params.id) };
    let db_connect = req.db;
    db_connect.collection("Characters").updateOne(id, {$set:{
    'armor': req.body.armor
  }}, (err, result) => {
      if (err) { return next(err); }
      console.log("character armor updated");
      res.send('user updated sucessfully');
    });
  });

  // ------------------------------------------------------Item Section-----------------------------------------------------------

  // This section will get a list of all the items.
  equipmentRouter.route("/items/:campaign").get(function (req, res, next) {
    let db_connect = req.db;
    db_connect
      .collection("Items")
      .find({ campaign: req.params.campaign })
      .toArray(function (err, result) {
        if (err) return next(err);
        res.json(result);
      });
  });

  // This section will create a new item.
  equipmentRouter.route("/item/add").post(function  (req, response, next) {
    let db_connect = req.db;
    let myobj = {
      campaign: req.body.campaign,
      itemName: req.body.itemName,
      notes: req.body.notes,
      str: req.body.str,
      dex: req.body.dex,
      con: req.body.con,
      int: req.body.int,
      wis: req.body.wis,
      cha: req.body.cha,
      appraise: req.body.appraise,
      balance: req.body.balance,
      bluff: req.body.bluff,
      climb: req.body.climb,
      concentration: req.body.concentration,
      decipherScript: req.body.decipherScript,
      diplomacy: req.body.diplomacy,
      disableDevice: req.body.disableDevice,
      disguise: req.body.disguise,
      escapeArtist: req.body.escapeArtist,
      forgery: req.body.forgery,
      gatherInfo: req.body.gatherInfo,
      handleAnimal: req.body.handleAnimal,
      heal: req.body.heal,
      hide: req.body.hide,
      intimidate: req.body.intimidate,
      jump: req.body.jump,
      listen: req.body.listen,
      moveSilently: req.body.moveSilently,
      openLock: req.body.openLock,
      ride: req.body.ride,
      search: req.body.search,
      senseMotive: req.body.senseMotive,
      sleightOfHand: req.body.sleightOfHand,
      spot: req.body.spot,
      survival: req.body.survival,
      swim: req.body.swim,
      tumble: req.body.tumble,
      useTech: req.body.useTech,
      useRope: req.body.useRope
    };
    db_connect.collection("Items").insertOne(myobj, function (err, res) {
      if (err) return next(err);
      response.json(res);
    });
  });

  // This section will update items.
  equipmentRouter.route('/update-item/:id').put((req, res, next) => {
    let id = { _id: ObjectId(req.params.id) };
    let db_connect = req.db;
    db_connect.collection("Characters").updateOne(id, {$set:{
    'item': req.body.item
  }}, (err, result) => {
      if (err) { return next(err); }
      console.log("character item updated");
      res.send('user updated sucessfully');
    });
  });

  router.use(equipmentRouter);
};
