import { buildRaceTokenNameVariants, buildRaceTokenScopeData } from './raceTokenFilters';

describe('race token filter helpers', () => {
  describe('buildRaceTokenNameVariants', () => {
    it('includes pluralized variants for common races', () => {
      const variants = buildRaceTokenNameVariants('Human');

      expect(variants).toEqual(expect.arrayContaining(['Human', 'Humans']));
    });

    it('normalizes hyphenated race names', () => {
      const variants = buildRaceTokenNameVariants('Half-elf');

      expect(variants).toEqual(expect.arrayContaining(['Half-Elf', 'Half-Elves']));
    });
  });

  describe('buildRaceTokenScopeData', () => {
    it('generates race-specific prefixes for token scopes', () => {
      const { prefixes } = buildRaceTokenScopeData('Human');

      expect(prefixes).toEqual(
        expect.arrayContaining([
          'Human',
          'Humans',
          'Adventurers/Humans',
          'Tokens/Adventurers/Humans',
        ])
      );
    });

    it('limits small-sized races to smallfolk token prefixes', () => {
      const { prefixes, isSmallfolk } = buildRaceTokenScopeData('Halfling', { size: 'Small' });

      expect(isSmallfolk).toBe(true);
      expect(prefixes).toEqual(
        expect.arrayContaining([
          'Smallfolk/Halfling',
          'Smallfolk/Halflings',
          'Adventurers/Smallfolk/Halfling',
          'Adventurers/Smallfolk/Halflings',
          'Tokens/Adventurers/Smallfolk/Halfling',
        ])
      );
      expect(prefixes).not.toEqual(expect.arrayContaining(['Adventurers/Halfling']));
    });
  });
});
