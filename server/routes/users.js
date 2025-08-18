const express = require('express');
const { body, param, validationResult } = require('express-validator');
const connectDB = require('../db/conn');
const usersController = require('../controllers/users');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  handleValidationErrors,
  usersController.login
);

router.post(
  '/verify',
  [
    body('username').trim().notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  handleValidationErrors,
  usersController.verifyUser
);

router.get('/', authenticateToken, usersController.getUsers);

router.get('/:username', authenticateToken, usersController.getUser);

router.post(
  '/add',
  [
    body('username').trim().notEmpty().withMessage('username is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('password must be at least 6 characters'),
  ],
  handleValidationErrors,
  usersController.addUser
);

module.exports = router;
