const express = require('express');
const dbo = require('../db/conn');
const { ObjectId } = require('mongodb');

const router = express.Router();

// Campaign gear lookups
router.get('/items/:campaign', async (req, res) => {
  const { campaign } = req.params;
  if (!campaign) {
    return res.status(400).json({ message: 'Invalid campaign' });
  }
  try {
    const db = dbo.getDb();
    const items = await db
      .collection('Items')
      .find({ campaign })
      .toArray();
    if (!items.length) {
      return res.status(404).json({ message: 'Items not found' });
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/armor/:campaign', async (req, res) => {
  const { campaign } = req.params;
  if (!campaign) {
    return res.status(400).json({ message: 'Invalid campaign' });
  }
  try {
    const db = dbo.getDb();
    const armor = await db
      .collection('Armor')
      .find({ campaign })
      .toArray();
    if (!armor.length) {
      return res.status(404).json({ message: 'Armor not found' });
    }
    res.json(armor);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/weapons/:campaign', async (req, res) => {
  const { campaign } = req.params;
  if (!campaign) {
    return res.status(400).json({ message: 'Invalid campaign' });
  }
  try {
    const db = dbo.getDb();
    const weapons = await db
      .collection('Weapons')
      .find({ campaign })
      .toArray();
    if (!weapons.length) {
      return res.status(404).json({ message: 'Weapons not found' });
    }
    res.json(weapons);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/feats', async (req, res) => {
  try {
    const db = dbo.getDb();
    const feats = await db.collection('Feats').find({}).toArray();
    if (!feats.length) {
      return res.status(404).json({ message: 'Feats not found' });
    }
    res.json(feats);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/occupations', async (req, res) => {
  try {
    const db = dbo.getDb();
    const occupations = await db.collection('Occupations').find({}).toArray();
    if (!occupations.length) {
      return res.status(404).json({ message: 'Occupations not found' });
    }
    res.json(occupations);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Gear insertion routes
router.post('/weapon/add', async (req, res) => {
  const { campaign, weaponName } = req.body;
  if (typeof campaign !== 'string' || typeof weaponName !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Weapons').insertOne(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/armor/add', async (req, res) => {
  const { campaign, armorName } = req.body;
  if (typeof campaign !== 'string' || typeof armorName !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Armor').insertOne(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/item/add', async (req, res) => {
  const { campaign, itemName } = req.body;
  if (typeof campaign !== 'string' || typeof itemName !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Items').insertOne(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

// Get a single character by id
router.get('/characters/:id', async (req, res) => {
  try {
    const db = dbo.getDb();
    const character = await db
      .collection('Characters')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(character);
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

// Delete a character by id
router.delete('/delete-character/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  try {
    const db = dbo.getDb();
    const result = await db
      .collection('Characters')
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json({ deletedId: id });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update dice color
router.put('/update-dice-color/:id', async (req, res) => {
  const id = req.params.id;
  const { diceColor } = req.body;
  if (!ObjectId.isValid(id) || typeof diceColor !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { diceColor } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update additional skill array
router.put('/update-add-skill/:id', async (req, res) => {
  const id = req.params.id;
  const { newSkill } = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(newSkill)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { newSkill } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update skill fields
router.put('/update-skills/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  if (
    !ObjectId.isValid(id) ||
    typeof updates !== 'object' ||
    Array.isArray(updates) ||
    !Object.values(updates).every((v) => typeof v === 'number')
  ) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update previously added skills
router.put('/updated-add-skills/:id', async (req, res) => {
  const id = req.params.id;
  const { newSkill } = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(newSkill)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { newSkill } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update armor array
router.put('/update-armor/:id', async (req, res) => {
  const id = req.params.id;
  const { armor } = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(armor)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { armor } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update feat array
router.put('/update-feat/:id', async (req, res) => {
  const id = req.params.id;
  const { feat } = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(feat)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { feat } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update item array
router.put('/update-item/:id', async (req, res) => {
  const id = req.params.id;
  const { item } = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(item)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { item } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update stats
router.put('/update-stats/:id', async (req, res) => {
  const id = req.params.id;
  const { str, dex, con, int, wis, cha } = req.body;
  const values = [str, dex, con, int, wis, cha];
  if (!ObjectId.isValid(id) || values.some((v) => typeof v !== 'number')) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { str, dex, con, int, wis, cha } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update temporary health
router.put('/update-temphealth/:id', async (req, res) => {
  const id = req.params.id;
  const { tempHealth } = req.body;
  if (!ObjectId.isValid(id) || typeof tempHealth !== 'number') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { tempHealth } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update weapon array
router.put('/update-weapon/:id', async (req, res) => {
  const id = req.params.id;
  const { weapon } = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(weapon)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { weapon } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update level for an occupation and health
router.put('/update-level/:id', async (req, res) => {
  const id = req.params.id;
  const { selectedOccupation, level, health } = req.body;
  if (
    !ObjectId.isValid(id) ||
    typeof selectedOccupation !== 'string' ||
    typeof level !== 'number' ||
    typeof health !== 'number'
  ) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id), 'occupation.Occupation': selectedOccupation },
      { $set: { 'occupation.$.Level': level, health } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update health and stat totals
router.put('/update-health/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  if (!ObjectId.isValid(id) || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Replace occupations array
router.put('/update-occupations/:id', async (req, res) => {
  const id = req.params.id;
  const occupations = req.body;
  if (!ObjectId.isValid(id) || !Array.isArray(occupations)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const db = dbo.getDb();
    const result = await db.collection('Characters').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { occupation: occupations } },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
