const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbo = require('../db/conn');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const jwtSecretKey = process.env.JWT_SECRET;

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const db = dbo.getDb();
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ username: user.username }, jwtSecretKey, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify user credentials
router.post('/users/verify', async (req, res) => {
  const { username, password } = req.body;
  try {
    const db = dbo.getDb();
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (protected route)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const db = dbo.getDb();
    const users = await db.collection('users').find({}).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by username (protected route)
router.get('/users/:username', authenticateToken, async (req, res) => {
  try {
    const db = dbo.getDb();
    const user = await db.collection('users').findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
