const express = require('express');
const spells = require('../data/spells');
const classSpellLists = require('../data/classSpellLists');

// Extract a basic damage dice string (e.g., "8d6" or "1d8+2") from spell descriptions
function extractDamage(description = '') {
  const match = description.match(/(\d+d\d+(?:\s*[+\-]\s*\d+)?)[^\n]*damage/i);
  return match ? match[1].replace(/\s+/g, '') : undefined;
}

// Extract "At Higher Levels" text if present
function extractHigherLevels(description = '') {
  const match = description.match(/At Higher Levels?[:.]\s*([^]*)/i);
  return match ? match[1].trim() : undefined;
}

function extractScaling(description = '') {
  const level5 = description.match(/5th level \(([^)]+)\)/i);
  const level11 = description.match(/11th level \(([^)]+)\)/i);
  const level17 = description.match(/17th level \(([^)]+)\)/i);
  const scaling = {};
  if (level5) scaling[5] = level5[1].replace(/\s+/g, '');
  if (level11) scaling[11] = level11[1].replace(/\s+/g, '');
  if (level17) scaling[17] = level17[1].replace(/\s+/g, '');
  return Object.keys(scaling).length ? scaling : undefined;
}

// Augment spells with a `damage` field when possible
Object.values(spells).forEach((spell) => {
  if (!spell.damage) {
    const dmg = extractDamage(spell.description);
    if (dmg) spell.damage = dmg;
  }
  if (!spell.higherLevels) {
    const upcast = extractHigherLevels(spell.description);
    if (upcast) spell.higherLevels = upcast;
  }
  if (spell.level === 0 && !spell.scaling) {
    const scaling = extractScaling(spell.description);
    if (scaling) spell.scaling = scaling;
  }
});

module.exports = (router) => {
  const spellRouter = express.Router();

  spellRouter.get('/', (req, res) => {
    const className = req.query.class?.toLowerCase();
    if (className && classSpellLists[className]) {
      const allowed = classSpellLists[className];
      const filtered = Object.fromEntries(
        allowed.map(id => [id, spells[id]]).filter(([, spell]) => spell)
      );
      return res.json(filtered);
    }
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
