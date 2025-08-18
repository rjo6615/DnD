const { param } = require('express-validator');
const express = require('express');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

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
    (req, res) => {
      if (!Array.isArray(req.body)) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'body must be an array of players', param: 'body' }] });
      }
      const campaignName = req.params.campaign;
      const newPlayers = req.body; // Assuming newPlayers is an array of players

      const db_connect = req.db;
      db_connect.collection("Campaigns").updateOne(
        { campaignName: campaignName },
        { $addToSet: { 'players': { $each: newPlayers } } }, // Add new players to existing array only if they are not already present
        (err, result) => {
          if(err) {
            console.error("Error adding players:", err);
            return res.status(500).send("Internal Server Error");
          }
          console.log("Players added");
          if (result.modifiedCount === 0) {
            // If no modifications were made, it means the players were not added because they already exist
            return res.status(400).send("Players already exist in the array");
          }
          res.send('Players added successfully');
        }
      );
    }
  );

  // This section will find all characters in a specific campaign.
  campaignRouter.route("/campaign/:campaign/characters").get(function (req, res) {
    let db_connect = req.db;
    db_connect
      .collection("Characters")
      .find({ campaign: req.params.campaign })
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });

  // This section will find all of the users characters in a specific campaign.
  campaignRouter.route("/campaign/:campaign/:username").get(function (req, res) {
    let db_connect = req.db;
    db_connect
      .collection("Characters")
      .find({ campaign: req.params.campaign, token: req.params.username })
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
   });

  // This section will find a specific campaign.
  campaignRouter.route("/campaign/:campaign").get(function (req, res) {
    let db_connect = req.db;
    db_connect
      .collection("Campaigns")
      .findOne({ campaignName: req.params.campaign }, function (err, result) {
        if (err) {
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.json(result);
      });
  });

  // This section will get a list of all the campaigns.
  campaignRouter.route("/campaigns/:player").get(function (req, res) {
    let db_connect = req.db;
    db_connect
      .collection("Campaigns")
      .find({ players: { $in: [req.params.player] } }) // Using $in to search for the player in the players array
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });

  // This section will create a new campaign.
  campaignRouter.route("/campaign/add").post(function (req, response) {
    let db_connect = req.db;
    let myobj = {
      campaignName: req.body.campaignName,
      gameMode: req.body.gameMode,
      dm: req.body.dm,
      players: req.body.players,
    };
    db_connect.collection("Campaigns").insertOne(myobj, function (err, res) {
      if (err) throw err;
      response.json(res);
    });
   });


  // This section will be for the DM
  campaignRouter.route("/campaignsDM/:DM").get(function (req, res) {
    let db_connect = req.db;
    db_connect
      .collection("Campaigns")
      .find({ dm: req.params.DM })
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
   });

  campaignRouter.route("/campaignsDM/:DM/:campaign").get(function (req, res) {
    let db_connect = req.db;
    db_connect
      .collection("Campaigns")
      .findOne({ dm: req.params.DM, campaignName: req.params.campaign }, function (err, result) {
        if (err) throw err;
        res.json(result);
      });
  });

  router.use(campaignRouter);
};
