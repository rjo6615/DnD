const fs = require('fs');
const path = require('path');
const spells = require('../server/data/spells');

function extractHigherLevels(description = '') {
  const match = description.match(/At Higher Levels?[:.]\s*([^]*)/i);
  return match ? match[1].trim() : undefined;
}

// Manual overrides for spells whose descriptions are missing higher-level text
const manualHigherLevels = {
  'burning-hands': 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
  'cure-wounds': 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.',
};

Object.values(spells).forEach(spell => {
  if (!spell.higherLevels) {
    const hl = extractHigherLevels(spell.description);
    if (hl) {
      spell.higherLevels = hl;
    } else if (manualHigherLevels[spell.name.toLowerCase().replace(/\s+/g, '-')]) {
      spell.higherLevels = manualHigherLevels[spell.name.toLowerCase().replace(/\s+/g, '-')];
    }
  }
});

const output = `/**
 * D&D 5e SRD Spells (generated)
 * Source: SRD 5.1 (CC-BY 4.0 — © Wizards of the Coast)
 * Generated: ${new Date().toISOString()}
 */
/** @typedef {import('../../types/spell').Spell} Spell */
/** @type {Record<string, Spell>} */
const spells = ${JSON.stringify(spells, null, 2)};

module.exports = spells;
`;

fs.writeFileSync(path.join(__dirname, '../server/data/spells.js'), output);
