const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/srd-5.2-spells.json');
const CLIENT_PATH = path.join(__dirname, '../client/src/data/spells.json');

/** @type {Record<string, import('../types/spell').Spell>} */
const spells = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

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

// Manual overrides for spells whose descriptions are missing higher-level text
const manualHigherLevels = {
  'burning-hands': 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
  'cure-wounds': 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.',
  'guiding-bolt': 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
  'hellish-rebuke': 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d10 for each slot level above 1st.',
  'inflict-wounds': 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d10 for each slot level above 1st.',
  'magic-missile': 'When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.',
  'acid-arrow': "When you cast this spell using a spell slot of 3rd level or higher, the initial damage increases by 1d4 for each slot level above 2nd, and the damage at the end of the target's next turn increases by 1d4 for each slot level above 2nd.",
  'scorching-ray': 'When you cast this spell using a spell slot of 3rd level or higher, you create one additional ray for each slot level above 2nd.',
  'shatter': 'When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d8 for each slot level above 2nd.',
  'fireball': 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
  'lightning-bolt': 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
  'vampiric-touch': 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
  'ice-storm': 'When you cast this spell using a spell slot of 5th level or higher, the bludgeoning damage increases by 1d8 for each slot level above 4th.',
  'stone-shape': 'When you cast this spell using a spell slot of 5th level or higher, you can target one additional 5-foot cube for each slot level above 4th.',
  'flame-strike': 'When you cast this spell using a spell slot of 6th level or higher, the fire damage increases by 1d6 for each slot level above 5th.',
  'disintegrate': 'When you cast this spell using a spell slot of 7th level or higher, the damage increases by 3d6 for each slot level above 6th.',
};

Object.entries(spells).forEach(([id, spell]) => {
  if (!spell.higherLevels) {
    const hl = extractHigherLevels(spell.description);
    if (hl) {
      spell.higherLevels = hl;
    } else if (manualHigherLevels[id]) {
      spell.higherLevels = manualHigherLevels[id];
    }
  }
  if (spell.level === 0 && !spell.scaling) {
    const scaling = extractScaling(spell.description);
    if (scaling) spell.scaling = scaling;
  }
});

const ordered = Object.fromEntries(Object.keys(spells).sort().map(key => [key, spells[key]]));
fs.writeFileSync(DATA_PATH, `${JSON.stringify(ordered, null, 2)}\n`);
fs.copyFileSync(DATA_PATH, CLIENT_PATH);

console.log(`Updated ${Object.keys(spells).length} spells.`);
