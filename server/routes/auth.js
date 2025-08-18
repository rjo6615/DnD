const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const authenticateUser = require('../utils/authenticateUser');
const handleValidationErrors = require('../middleware/validation');

const jwtSecretKey = process.env.JWT_SECRET;

module.exports = (router) => {
  router.post(
    '/login',
    [
      body('username').trim().notEmpty().withMessage('username is required'),
      body('password').notEmpty().withMessage('password is required'),
    ],
    handleValidationErrors,
    async (req, res) => {
      const { username, password } = req.body;

      const db_connect = req.db;
      try {
        const user = await authenticateUser(db_connect, username, password);
        if (!user) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ username: user.username }, jwtSecretKey, { expiresIn: '1h' });
        res.json({ token });
        console.debug('JWT token generated for login request', {
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
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
    async (req, res) => {
      const { username, password } = req.body;

      const db_connect = req.db;
      try {
        const user = await authenticateUser(db_connect, username, password);
        if (!user) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }
        res.json({ valid: true });
      } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  );
};
