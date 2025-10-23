import { buildEnemyTokenFilterScopeValues } from './enemyTokenFilters';

describe('buildEnemyTokenFilterScopeValues', () => {
  it('returns scope values targeting cultist adversary folders', () => {
    const scope = buildEnemyTokenFilterScopeValues('cultist', { index: 'cultist', name: 'Cultist' });

    expect(scope).toBeInstanceOf(Array);
    expect(scope[0]).toBe('folder:Tokens/Adversaries/Cultist');
    expect(scope[1]).toBe('Tokens/Adversaries/Cultist');
    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Cultist',
        'Tokens/Adversaries/Cultist',
        'folder:Tokens/Adversaries/Cultists',
        'Tokens/Adversaries/Cultists',
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

    expect(scope[0]).toBe('folder:Tokens/Adversaries/Giant_Wolf_Spider');
    expect(scope[1]).toBe('Tokens/Adversaries/Giant_Wolf_Spider');
    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Giant Wolf Spider',
        'Tokens/Adversaries/Giant Wolf Spider',
        'folder:Tokens/Adversaries/Giant Wolf Spiders',
        'Tokens/Adversaries/Giant Wolf Spiders',
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

  it('does not include unrelated wolf spider folders when selecting wolf', () => {
    const scope = buildEnemyTokenFilterScopeValues('wolf', { index: 'wolf', name: 'Wolf' });

    const lowerScope = scope.map((value) => value.toLowerCase());

    expect(lowerScope).not.toEqual(expect.arrayContaining(['wolf spider', 'wolf spiders']));
    lowerScope.forEach((value) => {
      expect(value).not.toContain('wolf spider');
    });
  });

  it('returns null when no identifying information is provided', () => {
    expect(buildEnemyTokenFilterScopeValues(null, null)).toBeNull();
    expect(buildEnemyTokenFilterScopeValues('', {})).toBeNull();
  });
});
