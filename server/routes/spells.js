const express = require('express');
const spells = require('../data/spells');

// Extract a basic damage dice string (e.g., "8d6" or "1d8+2") from spell descriptions
function extractDamage(description = '') {
  const match = description.match(/(\d+d\d+(?:\s*[+\-]\s*\d+)?)[^\n]*damage/i);
  return match ? match[1].replace(/\s+/g, '') : undefined;
}

// Augment spells with a `damage` field when possible
Object.values(spells).forEach((spell) => {
  if (!spell.damage) {
    const dmg = extractDamage(spell.description);
    if (dmg) spell.damage = dmg;
  }
});

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
