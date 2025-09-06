const express = require('express');
const backgrounds = require('../data/backgrounds');

module.exports = (router) => {
  const backgroundRouter = express.Router();

  backgroundRouter.get('/', (_req, res) => {
    res.json(backgrounds);
  });

  backgroundRouter.get('/:name', (req, res) => {
    const bg = backgrounds[req.params.name.toLowerCase()];
    if (!bg) {
      return res.status(404).json({ message: 'Background not found' });
    }
    res.json(bg);
  });

  router.use('/backgrounds', backgroundRouter);
};
