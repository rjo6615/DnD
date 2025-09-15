const express = require('express');

const SPELLS_MODULE_PATH = require.resolve('../data/spells');

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

function augmentSpell(spell = {}) {
  const enhanced = { ...spell };
  if (!enhanced.damage) {
    const dmg = extractDamage(enhanced.description);
    if (dmg) enhanced.damage = dmg;
  }
  if (!enhanced.higherLevels) {
    const upcast = extractHigherLevels(enhanced.description);
    if (upcast) enhanced.higherLevels = upcast;
  }
  if (enhanced.level === 0 && !enhanced.scaling) {
    const scaling = extractScaling(enhanced.description);
    if (scaling) enhanced.scaling = scaling;
  }
  return enhanced;
}

async function withSpellData(handler) {
  delete require.cache[SPELLS_MODULE_PATH];
  const spells = require(SPELLS_MODULE_PATH);
  try {
    return await handler(spells);
  } finally {
    delete require.cache[SPELLS_MODULE_PATH];
  }
}

function normalizeClassQuery(value) {
  if (!value) return null;
  const query = Array.isArray(value) ? value[0] : value;
  if (typeof query !== 'string') return null;
  const trimmed = query.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function buildSpellMap(spells, { className } = {}) {
  const shouldFilterByClass = Boolean(className);
  const entries = [];

  if (shouldFilterByClass) {
    for (const [id, spell] of Object.entries(spells)) {
      const classes = spell.classes;
      if (!Array.isArray(classes)) continue;
      const matches = classes.some(cls => cls.toLowerCase() === className);
      if (!matches) continue;
      entries.push([id, augmentSpell(spell)]);
    }
    if (!entries.length) {
      return null;
    }
    entries.sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries);
  }

  for (const [id, spell] of Object.entries(spells)) {
    entries.push([id, augmentSpell(spell)]);
  }
  return Object.fromEntries(entries);
}

module.exports = (router) => {
  const spellRouter = express.Router();

  spellRouter.get('/', async (req, res, next) => {
    try {
      const className = normalizeClassQuery(req.query.class);
      const payload = await withSpellData(async spells => {
        if (className) {
          const filtered = buildSpellMap(spells, { className });
          if (filtered) return filtered;
        }
        return buildSpellMap(spells);
      });
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  spellRouter.get('/:name', async (req, res, next) => {
    try {
      const payload = await withSpellData(async spells => {
        const spell = spells[req.params.name.toLowerCase()];
        return spell ? augmentSpell(spell) : null;
      });
      if (!payload) {
        return res.status(404).json({ message: 'Spell not found' });
      }
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.use('/spells', spellRouter);
};
