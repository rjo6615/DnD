const express = require('express');
const { items, categories } = require('../data/items');

module.exports = (router) => {
  const itemRouter = express.Router();

  itemRouter.get('/', (_req, res) => {
    res.json(items);
  });

  itemRouter.get('/options', (_req, res) => {
    res.json({ categories });
  });

  itemRouter.get('/:name', (req, res) => {
    const item = items[req.params.name.toLowerCase()];
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  });

  router.use('/items', itemRouter);
};
