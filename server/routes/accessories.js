const express = require('express');
const { categories, slots } = require('../data/accessories');

module.exports = (router) => {
  const accessoryRouter = express.Router();

  accessoryRouter.get('/options', (_req, res) => {
    res.json({ categories, slots });
  });

  router.use('/accessories', accessoryRouter);
};
