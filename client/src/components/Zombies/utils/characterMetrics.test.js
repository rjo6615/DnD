import { calculateCharacterHitPoints } from './characterMetrics';

describe('calculateCharacterHitPoints', () => {
  it('calculates current and max hp using con and level', () => {
    const character = {
      health: 10,
      tempHealth: 8,
      con: 14,
      occupation: [{ Level: 1 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result).toEqual({ currentHp: 8, maxHp: 12 });
  });

  it('includes feat bonuses when available', () => {
    const character = {
      health: 20,
      tempHealth: '35',
      con: 16,
      occupation: [{ Level: 3 }],
      feat: [{ hpMaxBonus: 5, hpMaxBonusPerLevel: 2 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result).toEqual({ currentHp: 35, maxHp: 40 });
  });

  it('includes race hp bonuses when present', () => {
    const character = {
      health: 24,
      tempHealth: 24,
      con: 14,
      occupation: [{ Level: 2 }, { Level: 1 }],
      race: { name: 'Dwarf', hpMaxBonusPerLevel: 1 },
    };

    const result = calculateCharacterHitPoints(character);

    // Base 24 + (Con mod 2 * 3 levels) + 1 per level racial bonus
    expect(result).toEqual({ currentHp: 24, maxHp: 33 });
  });

  it('respects override values when provided', () => {
    const character = {
      health: 1,
      tempHealth: 0,
      occupation: [],
    };

    const result = calculateCharacterHitPoints(character, {
      baseHealth: 15,
      currentHp: 9,
      conMod: 4,
      totalLevel: 2,
      hpMaxBonus: 3,
      hpMaxBonusPerLevel: 1,
    });

    expect(result).toEqual({ currentHp: 9, maxHp: 28 });
  });

  it('returns nulls when data is missing', () => {
    const result = calculateCharacterHitPoints({}, {});

    expect(result).toEqual({ currentHp: null, maxHp: null });
  });

  it('does not default current hp to base health when no explicit value exists', () => {
    const character = {
      health: 30,
      con: 10,
      occupation: [{ Level: 3 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result.currentHp).toBeNull();
    expect(result.maxHp).toBe(30);
  });

  it('uses character.currentHp when provided', () => {
    const character = {
      health: 12,
      tempHealth: 4,
      currentHp: '9',
      con: 10,
      occupation: [{ Level: 1 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result.currentHp).toBe(9);
  });

  it('uses character.hpCurrent when provided', () => {
    const character = {
      health: 15,
      tempHealth: 5,
      hpCurrent: 11,
      con: 10,
      occupation: [{ Level: 1 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result.currentHp).toBe(11);
  });

  it('derives con modifier and hp bonuses from equipped items', () => {
    const baseCharacter = {
      health: 10,
      con: 10,
      occupation: [{ Level: 2 }],
      equipment: {},
    };

    const equippedCharacter = {
      ...baseCharacter,
      equipment: {
        head: {
          name: 'Helm of Vitality',
          statBonuses: { con: 4 },
          hpMaxBonus: 5,
          numericBonuses: { hpMaxBonusPerLevel: 1 },
        },
      },
    };

    const baseResult = calculateCharacterHitPoints(baseCharacter);
    const equippedResult = calculateCharacterHitPoints(equippedCharacter);

    expect(baseResult.maxHp).toBe(10);

    const expectedConMod = Math.floor(((baseCharacter.con + 4) - 10) / 2);
    const totalLevel = baseCharacter.occupation.reduce((sum, entry) => sum + Number(entry.Level), 0);
    const expectedMaxHp =
      baseCharacter.health +
      expectedConMod * totalLevel +
      5 +
      1 * totalLevel;

    expect(equippedResult.maxHp).toBe(expectedMaxHp);
    expect(equippedResult.maxHp - baseResult.maxHp).toBe(
      expectedConMod * totalLevel + 5 + totalLevel
    );
  });

  it('ignores hp bonuses from explicitly unowned accessories', () => {
    const character = {
      health: 12,
      con: 12,
      occupation: [{ Level: 2 }],
      accessories: [
        { statBonuses: { con: 6 }, hpMaxBonus: 20, owned: false },
        { hpMaxBonusPerLevel: 2, owned: false },
      ],
    };

    const result = calculateCharacterHitPoints(character);

    const expectedConMod = Math.floor((character.con - 10) / 2);
    const totalLevel = character.occupation.reduce(
      (sum, entry) => sum + Number(entry.Level),
      0
    );

    expect(result.maxHp).toBe(character.health + expectedConMod * totalLevel);
  });
});
