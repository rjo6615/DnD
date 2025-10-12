import { buildEnemyTokenFilterScopeValues } from './enemyTokenFilters';

describe('buildEnemyTokenFilterScopeValues', () => {
  it('returns scope values targeting cultist adversary folders', () => {
    const scope = buildEnemyTokenFilterScopeValues('cultist', { index: 'cultist', name: 'Cultist' });

    expect(scope).toBeInstanceOf(Array);
    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Cultist',
        'Tokens/Adversaries/Cultist',
        'folder:Tokens/Adversaries/Cultists',
        'Tokens/Adversaries/Cultists',
      ])
    );
    expect(scope.map((value) => value.toLowerCase())).toEqual(
      expect.arrayContaining(['cultist', 'cultists'])
    );
  });

  it('includes pluralized wolves scope for wolf adversaries', () => {
    const scope = buildEnemyTokenFilterScopeValues('wolf', { index: 'wolf', name: 'Wolf' });

    expect(scope.map((value) => value.toLowerCase())).toEqual(
      expect.arrayContaining([
        'wolf',
        'wolves',
        'folder:tokens/adversaries/wolf',
        'folder:tokens/adversaries/wolves',
      ])
    );
  });

  it('captures multi-word adversary folders', () => {
    const scope = buildEnemyTokenFilterScopeValues('giant-wolf-spider', {
      index: 'giant-wolf-spider',
      name: 'Giant Wolf Spider',
    });

    expect(scope).toEqual(
      expect.arrayContaining([
        'folder:Tokens/Adversaries/Giant Wolf Spider',
        'Tokens/Adversaries/Giant Wolf Spider',
        'folder:Tokens/Adversaries/Giant Wolf Spiders',
        'Tokens/Adversaries/Giant Wolf Spiders',
      ])
    );
    expect(scope.map((value) => value.toLowerCase())).toEqual(
      expect.arrayContaining(['giant wolf spider', 'giant wolf spiders'])
    );
  });

  it('returns null when no identifying information is provided', () => {
    expect(buildEnemyTokenFilterScopeValues(null, null)).toBeNull();
    expect(buildEnemyTokenFilterScopeValues('', {})).toBeNull();
  });
});
