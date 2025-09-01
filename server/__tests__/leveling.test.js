const { calculateFeatSlots, calculateStatPoints } = require('../utils/leveling');

describe('Leveling helpers', () => {
  test('non-Fighter/Rogue classes get feats at standard levels', () => {
    const get = (lvl) => calculateFeatSlots('Wizard', lvl);
    expect(get(3)).toBe(0);
    expect(get(4)).toBe(1);
    expect(get(8)).toBe(2);
    expect(get(12)).toBe(3);
    expect(get(16)).toBe(4);
    expect(get(19)).toBe(5);
  });

  test('fighters receive additional feats at levels 6 and 14', () => {
    const get = (lvl) => calculateFeatSlots('Fighter', lvl);
    expect(get(6)).toBe(2); // 4 and 6
    expect(get(14)).toBe(5); // 4,6,8,12,14
  });

  test('rogues receive an additional feat at level 10', () => {
    const get = (lvl) => calculateFeatSlots('Rogue', lvl);
    expect(get(10)).toBe(3); // 4,8,10
  });

  test('no stat points are granted from leveling alone', () => {
    expect(calculateStatPoints(1)).toBe(0);
    expect(calculateStatPoints(10)).toBe(0);
    expect(calculateStatPoints(20)).toBe(0);
  });
});
