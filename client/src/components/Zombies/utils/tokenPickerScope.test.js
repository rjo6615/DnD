import { buildTokenPickerScope } from './tokenPickerScope';

describe('buildTokenPickerScope', () => {
  it('includes race-specific class folders without including the base race folder', () => {
    const scope = buildTokenPickerScope({
      raceName: 'Dragonborn',
      occupations: [{ Occupation: 'Fighter' }],
      sizeFolder: 'Mediumfolk',
    });

    expect(scope).toEqual(expect.arrayContaining([
      'Core_Class_Tokens/Fighter',
      'Adventurers/Core_Class_Tokens/Fighter',
      'Tokens/Adventurers/Core_Class_Tokens/Fighter',
      'Core_Class_Tokens/Mediumfolk/Fighter',
      'Adventurers/Core_Class_Tokens/Mediumfolk/Fighter',
      'Tokens/Adventurers/Core_Class_Tokens/Mediumfolk/Fighter',
      'Dragonborn/Fighter',
      'Dragonborn/fighter',
      'Tokens/Adventurers/Dragonborn/Fighter',
      'Dragonborn/Core_Class_Tokens/Fighter',
      'Adventurers/Dragonborn/Core_Class_Tokens/Fighter',
      'Tokens/Adventurers/Dragonborn/Core_Class_Tokens/Fighter',
      'Dragonborn/Core_Class_Tokens/Mediumfolk/Fighter',
      'Adventurers/Dragonborn/Core_Class_Tokens/Mediumfolk/Fighter',
      'Tokens/Adventurers/Dragonborn/Core_Class_Tokens/Mediumfolk/Fighter',
    ]));

    expect(scope).not.toContain('Dragonborn');
    expect(scope).not.toContain('dragonborn');
    expect(scope).not.toContain('Tokens/Adventurers/Dragonborn');
  });

  it('falls back to race folders when no occupations are provided', () => {
    const scope = buildTokenPickerScope({
      raceName: 'Dragonborn',
      occupations: [],
      sizeFolder: 'Mediumfolk',
    });

    expect(scope).toEqual(
      expect.arrayContaining([
        'Adventurers/Dragonborn',
        'Adventurers/dragonborn',
        'Tokens/Adventurers/Dragonborn',
      ])
    );
  });
});
