const { param } = require('express-validator');
const express = require('express');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const logger = require('../utils/logger');

module.exports = (router) => {
  const campaignRouter = express.Router();

  // Apply authentication to all campaign routes
  campaignRouter.use(authenticateToken);

  // Add players to a campaign (protected route)
  campaignRouter.route('/players/add/:campaign').put(
    [
      param('campaign').trim().notEmpty().withMessage('campaign is required'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!Array.isArray(req.body)) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'body must be an array of players', param: 'body' }] });
      }
      const campaignName = req.params.campaign;
      const newPlayers = req.body; // Assuming newPlayers is an array of players

      try {
        const db_connect = req.db;
        const result = await db_connect.collection("Campaigns").updateOne(
          { campaignName: campaignName },
          { $addToSet: { players: { $each: newPlayers } } }
        );
        logger.info("Players added");
        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'Players already exist in the array' });
        }
        res.json({ message: 'Players added successfully' });
      } catch (err) {
        logger.error(`Error adding players: ${err}`);
        next(err);
      }
    }
  );

  // This section will find all characters in a specific campaign.
  campaignRouter.route("/campaign/:campaign/characters").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Characters")
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will find all of the users characters in a specific campaign.
  campaignRouter.route("/campaign/:campaign/:username").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Characters")
        .find({ campaign: req.params.campaign, token: req.params.username })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
   });

  // This section will find a specific campaign.
  campaignRouter.route("/campaign/:campaign").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .findOne({ campaignName: req.params.campaign });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will get a list of all the campaigns.
  campaignRouter.route("/campaigns/:player").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .find({ players: { $in: [req.params.player] } })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // This section will create a new campaign.
  campaignRouter.route("/campaign/add").post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      campaignName: req.body.campaignName,
      gameMode: req.body.gameMode,
      dm: req.body.dm,
      players: req.body.players,
    };
    try {
      const result = await db_connect.collection("Campaigns").insertOne(myobj);
      response.json(result);
    } catch (err) {
      next(err);
    }
   });


  // This section will be for the DM
  campaignRouter.route("/campaignsDM/:DM").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .find({ dm: req.params.DM })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
   });

  campaignRouter.route("/campaignsDM/:DM/:campaign").get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .findOne({ dm: req.params.DM, campaignName: req.params.campaign });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.use(campaignRouter);
};
