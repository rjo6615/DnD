const express = require('express');
const { categories, slots, accessories } = require('../data/accessories');

module.exports = (router) => {
  const accessoryRouter = express.Router();

  accessoryRouter.get('/', (_req, res) => {
    res.json(accessories);
  });

  accessoryRouter.get('/options', (_req, res) => {
    res.json({ categories, slots });
  });

  router.use('/accessories', accessoryRouter);
};
