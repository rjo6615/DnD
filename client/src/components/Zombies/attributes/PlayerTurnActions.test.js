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
});
