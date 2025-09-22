const express = require('express');
const { armors, types, categories } = require('../data/armor');
const { ARMOR_SLOT_OPTIONS } = require('../constants/equipmentSlots');

/** @typedef {import('../../types/armor').Armor} Armor */

module.exports = (router) => {
  const armorRouter = express.Router();

  armorRouter.get('/', (_req, res) => {
    res.json(armors);
  });

  armorRouter.get('/options', (_req, res) => {
    res.json({ types, categories, slots: ARMOR_SLOT_OPTIONS });
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
