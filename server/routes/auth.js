const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const authenticateUser = require('../utils/authenticateUser');
const handleValidationErrors = require('../middleware/validation');
const authenticateToken = require('../middleware/auth');
const logger = require('../utils/logger');
const config = require('../utils/config');

const jwtSecretKey = config.jwtSecret;
const isProd = process.env.NODE_ENV === 'production';

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
          secure: isProd,
          sameSite: isProd ? 'none' : 'lax',
          domain: isProd ? '.realmtracker.org' : undefined,
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
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      domain: isProd ? '.realmtracker.org' : undefined,
    });
    res.json({ message: 'Logged out' });
  });

  router.get('/me', authenticateToken, async (req, res, next) => {
    try {
      const db_connect = req.db;
      const user = await db_connect
        .collection('users')
        .findOne({ username: req.user.username });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ username: user.username, isDM: user.isDM });
    } catch (err) {
      next(err);
    }
  });
};
