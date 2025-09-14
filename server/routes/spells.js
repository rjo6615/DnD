const express = require('express');
const spells = require('../data/spells');
const classSpellLists = require('../data/classSpellLists');

// Extract a basic damage dice string and type (e.g., "8d6 fire") from spell descriptions
function extractDamage(description = '') {
  const damageTypes = [
    'acid',
    'bludgeoning',
    'piercing',
    'slashing',
    'fire',
    'cold',
    'lightning',
    'thunder',
    'force',
    'psychic',
    'radiant',
    'necrotic',
    'poison',
  ];
  const regex = new RegExp(
    `(\\d+d\\d+(?:\\s*[+\-]\\s*\\d+)?)[^\\n]*?\\b(${damageTypes.join('|')})\\b[^\\n]*damage`,
    'i'
  );
  const match = description.match(regex);
  return match
    ? { dice: match[1].replace(/\s+/g, ''), type: match[2].toLowerCase() }
    : undefined;
}

// Extract "At Higher Levels" text if present
function extractHigherLevels(description = '') {
  const match = description.match(/At Higher Levels?[:.]\s*([^]*)/i);
  return match ? match[1].trim() : undefined;
}

function extractScaling(description = '', type) {
  const level5 = description.match(/5th level \(([^)]+)\)/i);
  const level11 = description.match(/11th level \(([^)]+)\)/i);
  const level17 = description.match(/17th level \(([^)]+)\)/i);
  const scaling = {};
  if (level5) scaling[5] = `${level5[1].replace(/\s+/g, '')}${type ? ` ${type}` : ''}`;
  if (level11) scaling[11] = `${level11[1].replace(/\s+/g, '')}${type ? ` ${type}` : ''}`;
  if (level17) scaling[17] = `${level17[1].replace(/\s+/g, '')}${type ? ` ${type}` : ''}`;
  return Object.keys(scaling).length ? scaling : undefined;
}

// Augment spells with a `damage` field when possible
Object.values(spells).forEach((spell) => {
  const dmg = extractDamage(spell.description);
  if (!spell.damage && dmg) {
    spell.damage = `${dmg.dice} ${dmg.type}`;
  }
  if (spell.level === 0 && !spell.scaling) {
    const scaling = extractScaling(spell.description, dmg?.type);
    if (scaling) spell.scaling = scaling;
  }
  if (!spell.higherLevels) {
    const upcast = extractHigherLevels(spell.description);
    if (upcast) spell.higherLevels = upcast;
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
