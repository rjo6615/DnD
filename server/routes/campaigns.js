const express = require('express');
const dbo = require('../db/conn');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Add players to a campaign
router.put('/players/add/:campaign', authenticateToken, async (req, res) => {
  const campaignName = req.params.campaign;
  const newPlayers = req.body; // array of players
  try {
    const db = dbo.getDb();
    const result = await db.collection('Campaigns').updateOne(
      { campaignName },
      { $addToSet: { players: { $each: newPlayers } } }
    );
    if (result.modifiedCount === 0) {
      return res.status(400).send('Players already exist in the array');
    }
    res.send('Players added successfully');
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// Get campaigns for a player
router.get('/campaigns/:player', async (req, res) => {
  try {
    const db = dbo.getDb();
    const campaigns = await db
      .collection('Campaigns')
      .find({ players: req.params.player })
      .toArray();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new campaign
router.post('/campaign/add', async (req, res) => {
  try {
    const db = dbo.getDb();
    const result = await db.collection('Campaigns').insertOne({
      campaignName: req.body.campaignName,
      dm: req.body.dm,
      players: req.body.players || [],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
