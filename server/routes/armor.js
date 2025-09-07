const express = require('express');
const { armors, types, categories } = require('../data/armor');

/** @typedef {import('../../types/armor').Armor} Armor */

module.exports = (router) => {
  const armorRouter = express.Router();

  armorRouter.get('/', (_req, res) => {
    res.json(armors);
  });

  armorRouter.get('/options', (_req, res) => {
    res.json({ types, categories });
  });

  armorRouter.get('/:name', (req, res) => {
    /** @type {Armor | undefined} */
    const armor = armors[req.params.name.toLowerCase()];
    if (!armor) {
      return res.status(404).json({ message: 'Armor not found' });
    }
    res.json(armor);
  });

  router.use('/armor', armorRouter);
};
