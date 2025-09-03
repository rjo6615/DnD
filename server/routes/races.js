const express = require('express');
const races = require('../data/races');

module.exports = (router) => {
  const raceRouter = express.Router();

  raceRouter.get('/', (_req, res) => {
    res.json(races);
  });

  raceRouter.get('/:name', (req, res) => {
    const race = races[req.params.name.toLowerCase()];
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    res.json(race);
  });

  router.use('/races', raceRouter);
};
