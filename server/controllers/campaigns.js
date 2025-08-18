const ObjectId = require('mongodb').ObjectId;

function addPlayers(req, res) {
  if (!Array.isArray(req.body)) {
    return res
      .status(400)
      .json({ errors: [{ msg: 'body must be an array of players', param: 'body' }] });
  }
  const campaignName = req.params.campaign;
  const newPlayers = req.body;
  const db_connect = req.db;
  db_connect.collection('Campaigns').updateOne(
    { campaignName: campaignName },
    { $addToSet: { players: { $each: newPlayers } } },
    (err, result) => {
      if (err) {
        console.error('Error adding players:', err);
        return res.status(500).send('Internal Server Error');
      }
      if (result.modifiedCount === 0) {
        return res.status(400).send('Players already exist in the array');
      }
      res.send('Players added successfully');
    }
  );
}

function getCampaignCharacters(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Characters')
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) {
        return res.status(500).send('Server error');
      }
      res.json(result);
    });
}

function getUserCampaignCharacters(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Characters')
    .find({ campaign: req.params.campaign, token: req.params.username })
    .toArray(function (err, result) {
      if (err) {
        return res.status(500).send('Server error');
      }
      res.json(result);
    });
}

function getCampaign(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Campaigns')
    .findOne({ campaignName: req.params.campaign }, function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
}

function getCampaignsForPlayer(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Campaigns')
    .find({ players: { $in: [req.params.player] } })
    .toArray(function (err, result) {
      if (err) {
        return res.status(500).send('Server error');
      }
      res.json(result);
    });
}

function addCampaign(req, response) {
  const db_connect = req.db;
  const myobj = {
    campaignName: req.body.campaignName,
    gameMode: req.body.gameMode,
    dm: req.body.dm,
    players: req.body.players,
  };
  db_connect.collection('Campaigns').insertOne(myobj, function (err, res) {
    if (err) {
      return response.status(500).json({ message: 'Internal server error' });
    }
    response.json(res);
  });
}

function getCampaignsDM(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Campaigns')
    .find({ dm: req.params.DM })
    .toArray(function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
}

function getCampaignDM(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Campaigns')
    .findOne({ dm: req.params.DM, campaignName: req.params.campaign }, function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
}

module.exports = {
  addPlayers,
  getCampaignCharacters,
  getUserCampaignCharacters,
  getCampaign,
  getCampaignsForPlayer,
  addCampaign,
  getCampaignsDM,
  getCampaignDM,
};
