import { proficiencyBonus } from './dnd';

describe('proficiencyBonus', () => {
  it('returns 2 for levels 1-4', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
  });

  it('returns 3 for levels 5-8', () => {
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(8)).toBe(3);
  });

  it('returns 4 for levels 9-12', () => {
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(12)).toBe(4);
  });

  it('returns 5 for levels 13-16', () => {
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(16)).toBe(5);
  });

  it('returns 6 for levels 17 and above', () => {
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });
});
