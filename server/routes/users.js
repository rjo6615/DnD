const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

module.exports = (router) => {
  router.get('/users', authenticateToken, async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect.collection('users').find({}).toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/exists/:username', async (req, res, next) => {
    try {
      const db_connect = req.db;
      const user = await db_connect
        .collection('users')
        .findOne({ username: req.params.username });
      res.json({ exists: !!user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/:username', authenticateToken, async (req, res, next) => {
    try {
      const db_connect = req.db;
      const myquery = { username: req.params.username };
      const user = await db_connect.collection('users').findOne(myquery);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/users/add',
    [
      body('username').trim().notEmpty().withMessage('username is required'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('password must be at least 8 characters')
        .matches(/[a-z]/)
        .withMessage('password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('password must contain at least one uppercase letter')
        .matches(/\d/)
        .withMessage('password must contain at least one number')
        .matches(/[^A-Za-z0-9]/)
        .withMessage('password must contain at least one special character'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      const { username, password } = req.body;

      try {
        const db_connect = req.db;

        const existingUser = await db_connect
          .collection('users')
          .findOne({ username });
        if (existingUser) {
          return res.status(409).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const myobj = {
          username: username,
          password: hashedPassword,
        };

        const result = await db_connect.collection('users').insertOne(myobj);
        res.json(result);
      } catch (err) {
        // Handle duplicate key error thrown by MongoDB unique index
        if (err.code === 11000) {
          return res.status(409).json({ message: 'Username already exists' });
        }
        next(err);
      }
    }
  );
};
