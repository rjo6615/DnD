const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const logger = require('../utils/logger');

module.exports = (router) => {
  const skillsRouter = express.Router();

  // Apply authentication to all skills routes
  skillsRouter.use(authenticateToken);

  // This section will update skills.
  skillsRouter.route('/update-skills/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      const result = await db_connect.collection("Characters").findOneAndUpdate(
        id,
        {
          $set: {
            "appraise": req.body.appraise,
            "balance": req.body.balance,
            "bluff": req.body.bluff,
            "climb": req.body.climb,
            "concentration": req.body.concentration,
            "decipherScript": req.body.decipherScript,
            "diplomacy": req.body.diplomacy,
            "disableDevice": req.body.disableDevice,
            "disguise": req.body.disguise,
            "escapeArtist": req.body.escapeArtist,
            "forgery": req.body.forgery,
            "gatherInfo": req.body.gatherInfo,
            "handleAnimal": req.body.handleAnimal,
            "heal": req.body.heal,
            "hide": req.body.hide,
            "intimidate": req.body.intimidate,
            "jump": req.body.jump,
            "listen": req.body.listen,
            "moveSilently": req.body.moveSilently,
            "openLock": req.body.openLock,
            "ride": req.body.ride,
            "search": req.body.search,
            "senseMotive": req.body.senseMotive,
            "sleightOfHand": req.body.sleightOfHand,
            "spot": req.body.spot,
            "survival": req.body.survival,
            "swim": req.body.swim,
            "tumble": req.body.tumble,
            "useTech": req.body.useTech,
            "useRope": req.body.useRope,
          },
        },
        { returnDocument: 'after' }
      );
      res.status(200).json(result.value);
    } catch (err) {
      res.status(500).send('Server error');
    }
  });

  // This section will update added skills.
  skillsRouter.route('/update-add-skill/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      await db_connect.collection("Characters").updateOne(id, {
        $set: { 'newSkill': req.body.newSkill }
      });
      logger.info("character knowledge updated");
      res.send('user updated sucessfully');
    } catch (err) {
      next(err);
    }
  });

  // This section will update ranks of skills.
  skillsRouter.route('/updated-add-skills/:id').put(async  (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    try {
      const result = await db_connect.collection("Characters").findOneAndUpdate(
        id,
        { $set: { 'newSkill': req.body.newSkill } },
        { returnDocument: 'after' }
      );
      res.status(200).json(result.value);
    } catch (err) {
      res.status(500).send('Server error');
    }
  });

  router.use(skillsRouter);
};
