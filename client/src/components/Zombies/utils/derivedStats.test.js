import { calculateCharacterInitiative } from './derivedStats';

describe('calculateCharacterInitiative', () => {
  it('combines dexterity modifier with feat initiative bonuses', () => {
    const character = {
      dex: 14,
      feat: [{ initiative: 2 }],
    };

    expect(calculateCharacterInitiative(character)).toBe(4);
  });

  it('includes race ability bonuses when determining the dex modifier', () => {
    const character = {
      dex: 10,
      race: { abilities: { dex: 2 } },
    };

    expect(calculateCharacterInitiative(character)).toBe(1);
  });

  it('applies overrides and flat initiative bonuses from the character record', () => {
    const character = {
      dex: 10,
      accessories: [{ statOverrides: { dex: 18 } }],
      initiative: 1,
    };

    expect(calculateCharacterInitiative(character)).toBe(5);
  });

  it('ignores stat effects from explicitly unowned accessories', () => {
    const character = {
      dex: 10,
      accessories: [
        { statOverrides: { dex: 20 }, owned: false },
        { statBonuses: { dex: 2 }, owned: true },
      ],
    };

    // Only the owned accessory should contribute, resulting in dex 12 -> modifier +1
    expect(calculateCharacterInitiative(character)).toBe(1);
  });
});
