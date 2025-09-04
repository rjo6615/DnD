const express = require('express');
const routes = express.Router();
const connectDB = require('../db/conn');
require('dotenv').config();

const auth = require('./auth');
const users = require('./users');
const campaigns = require('./campaigns');
const characterBase = require('./characters/base');
const characterOccupations = require('./characters/occupations');
const characterStats = require('./characters/stats');
const characterHealth = require('./characters/health');
const skills = require('./skills');
const feats = require('./feats');
const equipment = require('./equipment');
const races = require('./races');
const spells = require('./spells');
const weapons = require('./weapons');
const weaponProficiency = require('./weaponProficiency');

routes.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

auth(routes);
users(routes);
campaigns(routes);
races(routes);
spells(routes);
weapons(routes);
// Register occupations routes before generic ID-based routes to ensure
// "/characters/occupations" is matched correctly.
characterOccupations(routes);
characterBase(routes);
characterStats(routes);
characterHealth(routes);
skills(routes);
feats(routes);
equipment(routes);
weaponProficiency(routes);

module.exports = routes;
