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
          },
        },
        { returnDocument: 'after' }
      );
      res.status(200).json(result.value);
    } catch (err) {
      next(err);
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
        res.json({ message: 'User updated successfully' });
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
      next(err);
    }
  });

  router.use('/skills', skillsRouter);
};
