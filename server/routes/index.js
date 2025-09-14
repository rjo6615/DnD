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
const classes = require('./classes');
const races = require('./races');
const backgrounds = require('./backgrounds');
const spells = require('./spells');
const weapons = require('./weapons');
const armor = require('./armor');
const items = require('./items');
const weaponProficiency = require('./weaponProficiency');
const armorProficiency = require('./armorProficiency');
const ai = require('./ai');

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
classes(routes);
races(routes);
backgrounds(routes);
spells(routes);
weapons(routes);
armor(routes);
items(routes);
ai(routes);
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
armorProficiency(routes);

module.exports = routes;
