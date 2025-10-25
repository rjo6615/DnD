import { buildPlayerTokenFolderScope } from './playerTokenFilters';

describe('buildPlayerTokenFolderScope', () => {
  it('returns null when race name is missing', () => {
    expect(buildPlayerTokenFolderScope(null, [])).toBeNull();
    expect(buildPlayerTokenFolderScope('', [])).toBeNull();
  });

  it('returns race folders when no classes are provided', () => {
    const scope = buildPlayerTokenFolderScope('Human', []);
    expect(scope).toEqual(
      expect.arrayContaining([
        'Human',
        'Adventurers/Human',
        'Tokens/Adventurers/Human',
        'folder:Tokens/Adventurers/Human',
      ])
    );
  });

  it('builds scoped folders for race and class combinations', () => {
    const scope = buildPlayerTokenFolderScope('Dragonborn', [
      { Occupation: 'Fighter' },
      { Occupation: 'fighter' },
    ]);

    expect(scope).toEqual(
      expect.arrayContaining([
        'Dragonborn/Fighter',
        'Adventurers/Dragonborn/Fighter',
        'Tokens/Adventurers/Dragonborn/Fighter',
        'folder:Tokens/Adventurers/Dragonborn/Fighter',
        'Tokens/Adventurers/Dragonborn/Fighters',
        'folder:Tokens/Adventurers/Dragonborn/Fighters',
        'Tokens/Adventurers/Dragonborn',
        'folder:Tokens/Adventurers/Dragonborn',
      ])
    );
    expect(scope.some((value) => value === 'Tokens/Adventurers/Dragonborn')).toBe(false);
    expect(scope.filter((value) => value === 'Dragonborn/Fighter').length).toBe(1);
    expect(
      scope.indexOf('Tokens/Adventurers/Dragonborn/Fighter') <
        scope.indexOf('Tokens/Adventurers/Dragonborn')
    ).toBe(true);
  });

  it('creates class variants when subclasses are provided', () => {
    const scope = buildPlayerTokenFolderScope('Elf', [
      { Occupation: 'Wizard (Evocation)' },
    ]);

    expect(scope).toEqual(
      expect.arrayContaining([
        'Elf/Wizard',
        'Adventurers/Elf/Wizard',
        'Tokens/Adventurers/Elf/Wizard',
        'folder:Tokens/Adventurers/Elf/Wizard',
        'Tokens/Adventurers/Elves',
      ])
    );
    expect(scope.some((value) => value === 'Tokens/Adventurers/Elf')).toBe(false);
  });

  it('handles multi-class characters', () => {
    const scope = buildPlayerTokenFolderScope('Half-Orc', [
      { Occupation: 'Barbarian' },
      { Occupation: 'Cleric' },
    ]);

    expect(scope).toEqual(
      expect.arrayContaining([
        'Half-Orc/Barbarian',
        'Half-Orc/Cleric',
        'Tokens/Adventurers/Half-Orc/Barbarian',
        'Tokens/Adventurers/Half-Orc/Cleric',
        'Tokens/Adventurers/Half-Orcs',
      ])
    );
    expect(scope.some((value) => value === 'Tokens/Adventurers/Half-Orc')).toBe(false);
  });

  it('supports race objects and occupation name properties', () => {
    const scope = buildPlayerTokenFolderScope({ name: 'Goliath' }, [
      { name: 'Cleric' },
    ]);

    expect(scope).toEqual(
      expect.arrayContaining([
        'Tokens/Adventurers/Goliaths/Cleric',
        'folder:Tokens/Adventurers/Goliaths/Cleric',
        'Tokens/Adventurers/Goliaths',
      ])
    );
  });

  it('collects class names from string entries', () => {
    const scope = buildPlayerTokenFolderScope('Elf', ['Ranger']);

    expect(scope).toEqual(
      expect.arrayContaining([
        'Tokens/Adventurers/Elves/Ranger',
        'folder:Tokens/Adventurers/Elves/Ranger',
        'Tokens/Adventurers/Elves/Rangers',
        'folder:Tokens/Adventurers/Elves/Rangers',
        'Tokens/Adventurers/Elves',
      ])
    );
    expect(scope.some((value) => value === 'Tokens/Adventurers/Elves')).toBe(false);
  });

  it('avoids runaway pluralization variants', () => {
    const scope = buildPlayerTokenFolderScope('Elf', ['Fighter', 'Fighters']);

    expect(scope.some((value) => /Elveses|Fighterses/i.test(value))).toBe(false);
  });

  it('avoids runaway pluralization variants', () => {
    const scope = buildPlayerTokenFolderScope('Elf', ['Fighter', 'Fighters']);

    expect(scope.some((value) => /Elveses|Fighterses/i.test(value))).toBe(false);
  });

  it('avoids runaway pluralization variants', () => {
    const scope = buildPlayerTokenFolderScope('Elf', ['Fighter', 'Fighters']);

    expect(scope.some((value) => /Elveses|Fighterses/i.test(value))).toBe(false);
  });
});
