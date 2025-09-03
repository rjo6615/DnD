const express = require('express');
const spells = require('../data/spells');

module.exports = (router) => {
  const spellRouter = express.Router();

  spellRouter.get('/', (_req, res) => {
    res.json(spells);
  });

  spellRouter.get('/:name', (req, res) => {
    const spell = spells[req.params.name.toLowerCase()];
    if (!spell) {
      return res.status(404).json({ message: 'Spell not found' });
    }
    res.json(spell);
  });

  router.use('/spells', spellRouter);
};
