import { resolveDamageTypeColor } from './diceColors';

describe('resolveDamageTypeColor', () => {
  it('returns black for slashing damage types', () => {
    expect(resolveDamageTypeColor('slashing')).toBe('#000000');
  });

  it('returns black for piercing damage regardless of casing', () => {
    expect(resolveDamageTypeColor('Piercing')).toBe('#000000');
  });

  it('returns black for bludgeoning damage phrases', () => {
    expect(resolveDamageTypeColor('bludgeoning damage')).toBe('#000000');
  });
});
