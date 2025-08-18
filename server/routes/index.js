const express = require('express');
const routes = express.Router();
const connectDB = require('../db/conn');
require('dotenv').config();

const auth = require('./auth');
const users = require('./users');
const campaigns = require('./campaigns');
const characters = require('./characters');

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
characters(routes);

module.exports = routes;
