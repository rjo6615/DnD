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
});
