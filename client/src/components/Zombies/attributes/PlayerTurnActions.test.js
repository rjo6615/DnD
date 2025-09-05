import { calculateDamage } from './PlayerTurnActions';

describe('calculateDamage parser', () => {
  const fixedRoll = (count, sides) => Array(count).fill(1);

  test('handles 10d4', () => {
    expect(calculateDamage('10d4', 0, false, fixedRoll)).toBe(10);
  });

  test('handles 10d4+1', () => {
    expect(calculateDamage('10d4+1', 0, false, fixedRoll)).toBe(11);
  });

  test('handles flat damage 100', () => {
    expect(calculateDamage('100', 0, false, fixedRoll)).toBe(100);
  });

  test('crit rolls extra dice but adds modifiers once', () => {
    let calls = 0;
    const critRoll = (count, sides) => {
      calls++;
      return Array(count).fill(1);
    };
    expect(calculateDamage('1d4+2', 4, true, critRoll)).toBe(8);
    expect(calls).toBe(2);
  });

  test('flat damage ignores crit flag', () => {
    expect(calculateDamage('100', 0, true, fixedRoll)).toBe(100);
  });
});
