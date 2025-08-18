const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

module.exports = (router) => {
  router.get('/users', authenticateToken, (req, res) => {
    let db_connect = req.db;
    db_connect
      .collection('users')
      .find({})
      .toArray(function (err, result) {
        if (err) {
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.json(result);
      });
  });

  router.get('/users/:username', authenticateToken, (req, res) => {
    let db_connect = req.db;
    let myquery = { username: req.params.username };
    db_connect
      .collection('users')
      .findOne(myquery, function (err, user) {
        if (err) {
          return res.status(500).json({ message: 'Internal server error' });
        }
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
  });

  router.post(
    '/users/add',
    [
      body('username').trim().notEmpty().withMessage('username is required'),
      body('password')
        .isLength({ min: 6 })
        .withMessage('password must be at least 6 characters'),
    ],
    handleValidationErrors,
    (req, res) => {
      const { username, password } = req.body;

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: 'Internal server error' });
        }

        let db_connect = req.db;
        let myobj = {
          username: username,
          password: hashedPassword,
        };

        db_connect.collection('users').insertOne(myobj, function (err, result) {
          if (err) {
            return res.status(500).json({ message: 'Internal server error' });
          }
          res.json(result);
        });
      });
    }
  );
};
