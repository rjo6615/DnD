const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const logger = require('../utils/logger');

module.exports = (router) => {
  const featRouter = express.Router();

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
  featRouter.route('/add').post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      featName: req.body.featName,
      notes: req.body.notes,
      acrobatics: req.body.acrobatics,
      animalHandling: req.body.animalHandling,
      arcana: req.body.arcana,
      athletics: req.body.athletics,
      deception: req.body.deception,
      history: req.body.history,
      insight: req.body.insight,
      intimidation: req.body.intimidation,
      investigation: req.body.investigation,
      medicine: req.body.medicine,
      nature: req.body.nature,
      perception: req.body.perception,
      performance: req.body.performance,
      persuasion: req.body.persuasion,
      religion: req.body.religion,
      sleightOfHand: req.body.sleightOfHand,
      stealth: req.body.stealth,
      survival: req.body.survival,
    };
    try {
      const result = await db_connect.collection("Feats").insertOne(myobj);
      response.json(result);
    } catch (err) {
      next(err);
    }
  });

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
