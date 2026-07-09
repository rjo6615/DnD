import { createActiveMapEnemySummaries } from './ZombiesDM';

describe('createActiveMapEnemySummaries', () => {
  const baseOptions = {
    tokenMetaById: {},
    participantLookup: new Map(),
    formatArmorClass: () => '—',
    formatChallengeRatingValue: (value) => value,
    activeParticipantId: null,
  };

  it('returns an empty array when no enemy tokens exist on the active map', () => {
    const results = createActiveMapEnemySummaries({
      ...baseOptions,
      activeMapTokens: {
        'enemy-1': { characterId: 'enemy-1' },
      },
      enemies: [
        { enemyId: 'enemy-1', name: 'Goblin', hitPoints: 7, armorClass: [{ value: 13 }] },
      ],
      tokenMetaById: {
        'enemy-1': { entityType: 'character' },
      },
    });

    expect(results).toEqual([]);
  });

  it('summarizes enemy data for tokens on the active map', () => {
    const participantLookup = new Map([["enemy-1", { characterId: 'enemy-1' }]]);

    const results = createActiveMapEnemySummaries({
      ...baseOptions,
      activeMapTokens: {
        'enemy-1': { characterId: 'enemy-1' },
      },
      tokenMetaById: {
        'enemy-1': { entityType: 'enemy' },
      },
      enemies: [
        {
          enemyId: 'enemy-1',
          name: 'Goblin',
          size: 'Small',
          hitPoints: 12,
          armorClass: [{ value: 13 }],
          challengeRating: 0.25,
        },
      ],
      participantLookup,
      formatArmorClass: () => '13',
      formatChallengeRatingValue: (value) => (value === 0.25 ? '1/4' : value),
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      challengeText: 'CR 1/4',
      sizeDisplay: 'Small',
      armorClassDisplay: '13',
      healthSummary: '12 / 12',
      inCombat: true,
    });
    expect(results[0].isActiveTurn).not.toBe(true);
  });

  it('marks the enemy whose turn is active', () => {
    const results = createActiveMapEnemySummaries({
      ...baseOptions,
      activeParticipantId: 'enemy-2',
      activeMapTokens: {
        'enemy-1': { characterId: 'enemy-1' },
        'enemy-2': { characterId: 'enemy-2' },
      },
      tokenMetaById: {
        'enemy-1': { entityType: 'enemy' },
        'enemy-2': { entityType: 'enemy' },
      },
      enemies: [
        { enemyId: 'enemy-1', name: 'Goblin', hitPoints: 7 },
        { enemyId: 'enemy-2', name: 'Orc', hitPoints: 15 },
      ],
    });

    const active = results.find((entry) => entry.enemy.enemyId === 'enemy-2');
    expect(active?.isActiveTurn).toBe(true);
    const inactive = results.find((entry) => entry.enemy.enemyId === 'enemy-1');
    expect(inactive?.isActiveTurn).not.toBe(true);
  });

  it('sorts summaries alphabetically by enemy name', () => {
    const results = createActiveMapEnemySummaries({
      ...baseOptions,
      activeMapTokens: {
        'enemy-a': { characterId: 'enemy-a' },
        'enemy-b': { characterId: 'enemy-b' },
      },
      tokenMetaById: {
        'enemy-a': { entityType: 'enemy' },
        'enemy-b': { entityType: 'enemy' },
      },
      enemies: [
        { enemyId: 'enemy-b', name: 'Zombie', hitPoints: 10 },
        { enemyId: 'enemy-a', name: 'Acolyte', hitPoints: 10 },
      ],
    });

    const names = results.map((entry) => entry.enemy.name);
    expect(names).toEqual(['Acolyte', 'Zombie']);
  });
});
