const express = require('express');
const dbo = require('../db/conn');

const router = express.Router();

// Create a new character
router.post('/character/add', async (req, res) => {
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').insertOne(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all characters in a campaign
router.get('/characters/campaign/:campaign', async (req, res) => {
  try {
    const db = dbo.getDb();
    const characters = await db
      .collection('Characters')
      .find({ campaign: req.params.campaign })
      .toArray();
    res.json(characters);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get characters for a campaign filtered by username
router.get('/campaign/:campaign/:username', async (req, res) => {
  try {
    const db = dbo.getDb();
    const characters = await db
      .collection('Characters')
      .find({ campaign: req.params.campaign, token: req.params.username })
      .toArray();
    res.json(characters);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
