const express = require('express');
const weapons = require('../data/weapons');

module.exports = (router) => {
  const weaponRouter = express.Router();

  weaponRouter.get('/', (_req, res) => {
    res.json(weapons);
  });

  weaponRouter.get('/:name', (req, res) => {
    const weapon = weapons[req.params.name.toLowerCase()];
    if (!weapon) {
      return res.status(404).json({ message: 'Weapon not found' });
    }
    res.json(weapon);
  });

  router.use('/weapons', weaponRouter);
};
