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

export function getEffectiveCasterLevel({ level = 0, casterProgression = 'full' } = {}) {
  if (casterProgression === 'half') {
    return level < 2 ? 0 : Math.ceil(level / 2);
  }
  return casterProgression === 'full' ? level : 0;
}

export function getSpellSlots(occupation = []) {
  const totalEffective = occupation.reduce((sum, o) => {
    const level = Number(o.Level) || 0;
    const casterProgression = o.casterProgression || o.CasterProgression || 'full';
    return sum + getEffectiveCasterLevel({ level, casterProgression });
  }, 0);

  const slotRow = SLOT_TABLE[totalEffective] || [];
  const slots = {};
  slotRow.forEach((count, lvl) => {
    if (lvl > 0 && count > 0) {
      slots[lvl] = count;
    }
  });
  return slots;
}

