const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');

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
  featRouter.route("/feat/add").post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      featName: req.body.featName,
      notes: req.body.notes,
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
    try {
      const result = await db_connect.collection("Feats").insertOne(myobj);
      response.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will update feats.
  featRouter.route('/update-feat/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection("Characters").updateOne(id, {
        $set: { 'feat': req.body.feat }
      });
      console.log("character feat updated");
      res.send('user updated sucessfully');
    } catch (err) {
      next(err);
    }
  });

  router.use(featRouter);
};
