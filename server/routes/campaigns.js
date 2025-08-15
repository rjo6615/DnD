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

// Get campaign details by campaign name
router.get('/campaign/:campaign', async (req, res) => {
  try {
    const db = dbo.getDb();
    const campaign = await db
      .collection('Campaigns')
      .findOne({ campaignName: req.params.campaign });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get campaigns by dungeon master username
router.get('/campaignsDM/:username', async (req, res) => {
  try {
    const db = dbo.getDb();
    const campaigns = await db
      .collection('Campaigns')
      .find({ dm: req.params.username })
      .toArray();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single campaign by dm and name
router.get('/campaignsDM/:username/:campaign', async (req, res) => {
  const { username, campaign } = req.params;
  if (!username || !campaign) {
    return res.status(400).json({ message: 'Invalid parameters' });
  }
  try {
    const db = dbo.getDb();
    const record = await db
      .collection('Campaigns')
      .findOne({ dm: username, campaignName: campaign });
    if (!record) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json(record);
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
