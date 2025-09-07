export const SLOT_TABLE = {
  0: Array(10).fill(0),
  1: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
};

export const SPELLCASTING_CLASSES = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  warlock: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
};

export function getSpellSlots(occupation = []) {
  const effectiveLevel = (occupation || []).reduce((sum, o) => {
    const name = (o.Name || o.Occupation || '').toLowerCase();
    const level = Number(o.Level) || 0;
    const progression = SPELLCASTING_CLASSES[name];
    if (progression === 'full') return sum + level;
    if (progression === 'half') return sum + (level === 1 ? 0 : Math.ceil(level / 2));
    return sum;
  }, 0);

  return SLOT_TABLE[effectiveLevel] || Array(10).fill(0);
}

export default getSpellSlots;
