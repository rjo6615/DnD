const express = require('express');
const users = require('./users');
const campaigns = require('./campaigns');
const characters = require('./characters');

const router = express.Router();

router.use(users);
router.use(campaigns);
router.use(characters);

module.exports = router;
