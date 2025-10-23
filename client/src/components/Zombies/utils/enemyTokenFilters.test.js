import { buildEnemyTokenFilterScopeValues } from './enemyTokenFilters';

describe('buildEnemyTokenFilterScopeValues', () => {
  it('returns scope values targeting cultist adversary folders', () => {
    const scope = buildEnemyTokenFilterScopeValues('cultist', { index: 'cultist', name: 'Cultist' });

    expect(scope).toBeInstanceOf(Array);
    expect(scope[0]).toBe('folder:Tokens/Adversaries/Cultists');
    expect(scope[1]).toBe('Tokens/Adversaries/Cultists');
    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Cultists',
        'Tokens/Adversaries/Cultists',
        'folder:Tokens/Adversaries/Cultist',
        'Tokens/Adversaries/Cultist',
      ])
    );
  });

  it('includes pluralized wolves scope for wolf adversaries', () => {
    const scope = buildEnemyTokenFilterScopeValues('wolf', { index: 'wolf', name: 'Wolf' });

    expect(scope.map((value) => value.toLowerCase())).toEqual(
      expect.arrayContaining([
        'folder:tokens/adversaries/wolf',
        'folder:tokens/adversaries/wolves',
        'tokens/adversaries/wolf',
        'tokens/adversaries/wolves',
      ])
    );
  });

  it('captures multi-word adversary folders', () => {
    const scope = buildEnemyTokenFilterScopeValues('giant-wolf-spider', {
      index: 'giant-wolf-spider',
      name: 'Giant Wolf Spider',
    });

    expect(scope[0]).toBe('folder:Tokens/Adversaries/Giant_Wolf_Spiders');
    expect(scope[1]).toBe('Tokens/Adversaries/Giant_Wolf_Spiders');
    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Giant_Wolf_Spiders',
        'Tokens/Adversaries/Giant_Wolf_Spiders',
        'folder:Tokens/Adversaries/Giant Wolf Spiders',
        'Tokens/Adversaries/Giant Wolf Spiders',
        'folder:Tokens/Adversaries/Giant Wolf Spider',
        'Tokens/Adversaries/Giant Wolf Spider',
      ])
    );
    expect(scope.map((value) => value.toLowerCase())).toEqual(
      expect.arrayContaining([
        'folder:tokens/adversaries/giant wolf spider',
        'tokens/adversaries/giant wolf spider',
        'folder:tokens/adversaries/giant wolf spiders',
        'tokens/adversaries/giant wolf spiders',
      ])
    );
  });

  it('limits scope values to adversary folders for orc adversaries', () => {
    const scope = buildEnemyTokenFilterScopeValues('orc', { index: 'orc', name: 'Orc' });

    expect(scope).toBeInstanceOf(Array);
    expect(scope.length).toBeGreaterThan(0);
    scope
      .map((value) => value.toLowerCase())
      .forEach((value) => {
        expect(value).toContain('adversaries');
      expect(value).not.toContain('adventurers');
    });
  });

  it('adds dm folder variants so the dungeon master filter matches', () => {
    const scope = buildEnemyTokenFilterScopeValues('orc', { index: 'orc', name: 'Orc' });

    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/DM/Adversaries/Orc',
        'Tokens/DM/Adversaries/Orc',
        'folder:DM/Adversaries/Orc',
        'DM/Adversaries/Orc',
      ])
    );
  });

  it('does not include unrelated wolf spider folders when selecting wolf', () => {
    const scope = buildEnemyTokenFilterScopeValues('wolf', { index: 'wolf', name: 'Wolf' });

    const lowerScope = scope.map((value) => value.toLowerCase());

    expect(lowerScope).not.toEqual(expect.arrayContaining(['wolf spider', 'wolf spiders']));
    lowerScope.forEach((value) => {
      expect(value).not.toContain('wolf spider');
    });
  });

  it('prefers monster name folders when no config is provided', () => {
    const scope = buildEnemyTokenFilterScopeValues('giant-badger', {
      index: 'giant-badger',
      name: 'Giant Badger',
    });

    expect(scope[0]).toBe('folder:Tokens/Adversaries/Giant_Badger');
    expect(scope[1]).toBe('Tokens/Adversaries/Giant_Badger');
    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Giant_Badger',
        'Tokens/Adversaries/Giant_Badger',
        'folder:Tokens/Adversaries/Giant Badger',
        'Tokens/Adversaries/Giant Badger',
      ])
    );
  });

  it('returns null when no identifying information is provided', () => {
    expect(buildEnemyTokenFilterScopeValues(null, null)).toBeNull();
    expect(buildEnemyTokenFilterScopeValues('', {})).toBeNull();
  });
});
