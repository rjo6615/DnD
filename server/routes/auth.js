const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const authenticateUser = require('../utils/authenticateUser');
const handleValidationErrors = require('../middleware/validation');
const authenticateToken = require('../middleware/auth');
const logger = require('../utils/logger');
const config = require('../utils/config');

const jwtSecretKey = config.jwtSecret;
const cookieDomain = process.env.COOKIE_DOMAIN || '.realmtracker.org';

module.exports = (router) => {
  router.post(
    '/login',
    [
      body('username').trim().notEmpty().withMessage('username is required'),
      body('password').notEmpty().withMessage('password is required'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const { username, password } = req.body;

      const db_connect = req.db;
      try {
        const user = await authenticateUser(db_connect, username, password);
        if (!user) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ username: user.username }, jwtSecretKey, { expiresIn: '1h' });
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          domain: cookieDomain,
        });
        res.json({ message: 'Logged in' });
        logger.info('User logged in', {
          timestamp: new Date().toISOString(),
          username: user.username,
        });
      } catch (err) {
        logger.error('Error during login request', { error: err.message });
        next(err);
      }
    }
  );

  router.post(
    '/users/verify',
    [
      body('username').trim().notEmpty().withMessage('username is required'),
      body('password').notEmpty().withMessage('password is required'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const { username, password } = req.body;

      const db_connect = req.db;
      try {
        const user = await authenticateUser(db_connect, username, password);
        if (!user) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }
        res.json({ valid: true });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post('/logout', (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      domain: cookieDomain,
    });
    res.json({ message: 'Logged out' });
  });

  router.get('/me', authenticateToken, async (req, res, next) => {
    try {
      const db_connect = req.db;
      const users = db_connect.collection('users');
      let user = await users.findOne({ username: req.user.username });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Ensure user documents have either an isDM flag or role string
      if (!('isDM' in user) && !('role' in user) && user._id) {
        await users.updateOne({ _id: user._id }, { $set: { role: 'player' } });
        user.role = 'player';
      } else {
        const update = {};
        if (!('role' in user) && user._id) {
          update.role = user.isDM ? 'dm' : 'player';
        }
        if (!('isDM' in user) && user._id) {
          update.isDM = user.role === 'dm';
        }
        if (Object.keys(update).length) {
          await users.updateOne({ _id: user._id }, { $set: update });
          user = { ...user, ...update };
        }
      }

      const isDM = !!user.isDM || user.role === 'dm';
      res.json({ username: user.username, isDM });
    } catch (err) {
      next(err);
    }
  });
};
