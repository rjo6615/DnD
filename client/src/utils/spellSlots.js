export const fullCasterSlots = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
 10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
 11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
 12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
 13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
 14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
 15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
 16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
 17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
 18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
 19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
 20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }
};

export const pactMagic = {
  1: { 1: 1 },
  2: { 1: 2 },
  3: { 2: 2 },
  4: { 2: 2 },
  5: { 3: 2 },
  6: { 3: 2 },
  7: { 4: 2 },
  8: { 4: 2 },
  9: { 5: 2 },
 10: { 5: 2 },
 11: { 5: 3 },
 12: { 5: 3 },
 13: { 5: 3 },
 14: { 5: 3 },
 15: { 5: 3 },
 16: { 5: 3 },
 17: { 5: 4 },
 18: { 5: 4 },
 19: { 5: 4 },
 20: { 5: 4 }
};

const PROGRESSION = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
  warlock: 'pact'
};

export function getSpellSlots(occupation = []) {
  let casterLevel = 0;
  let warlockLevel = 0;

  occupation.forEach((cls) => {
    const name = (cls.Name || cls.name || '').toLowerCase();
    const level = Number(cls.Level || cls.level || 0);
    const type = PROGRESSION[name];
    if (type === 'full') {
      casterLevel += level;
    } else if (type === 'half') {
      casterLevel += Math.floor(level / 2);
    } else if (type === 'pact') {
      warlockLevel += level;
    }
  });

  const table = fullCasterSlots[casterLevel] || {};
  const spellSlots = Object.entries(table).map(([lvl, total]) => ({
    level: Number(lvl),
    total,
    remaining: total
  }));

  let pactSlots;
  if (warlockLevel > 0) {
    const warlockTable = pactMagic[warlockLevel] || {};
    const entry = Object.entries(warlockTable)[0];
    if (entry) {
      const [lvl, total] = entry;
      pactSlots = { level: Number(lvl), total, remaining: total };
    }
  }

  return { spellSlots, pactSlots };
}

export default getSpellSlots;
