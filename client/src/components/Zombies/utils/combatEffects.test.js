import {
  addActiveEffect,
  advanceCombatTurn,
  buildExpirationFromDuration,
  endCombat,
  getEffectiveSpeed,
  normalizeCombatTimelineState,
  removeCombatantEffects,
  resolveCombatEvent,
} from './combatEffects';
import { calculateCharacterMovementSpeed } from './characterMetrics';

const participants = ['barb', 'rogue', 'goblin'].map((characterId, index) => ({ characterId, initiative: 20 - index }));
const baseState = (extra = {}) => normalizeCombatTimelineState({ participants, activeTurn: 0, round: 1, turnSequence: 1, ...extra });
const speedEffect = (overrides = {}) => ({
  id: overrides.id || 'slow-1',
  definitionId: 'barbarian-speed-reduction',
  sourceCombatantId: 'barb',
  targetCombatantId: 'goblin',
  expiration: { type: 'sourceTurn', sourceCombatantId: 'barb', boundary: 'start', remainingOccurrences: 1 },
  modifiers: [{ type: 'speed', operation: 'add', value: -15, minimum: 0 }],
  stackKey: 'barbarian-speed-reduction:barb:goblin',
  stackPolicy: 'refresh',
  ...overrides,
});

describe('turn-based combat effects', () => {
  test('source-start effect applied during source turn waits through other turns and expires next source start', () => {
    let state = addActiveEffect(baseState(), speedEffect());
    state = resolveCombatEvent(state, { type: 'turnStarted', combatantId: 'barb', round: 1, turnSequence: 1 });
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(state, 1);
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(state, 1);
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(state, 1);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('end-of-turn source effect expires at end boundary, not start boundary', () => {
    let state = addActiveEffect(baseState(), speedEffect({ expiration: { type: 'sourceTurn', sourceCombatantId: 'barb', boundary: 'end', remainingOccurrences: 1 } }));
    state = resolveCombatEvent(state, { type: 'turnStarted', combatantId: 'barb', round: 2, turnSequence: 4 });
    expect(state.activeEffects).toHaveLength(1);
    state = resolveCombatEvent(state, { type: 'turnEnded', combatantId: 'barb', round: 2, turnSequence: 4 });
    expect(state.activeEffects).toHaveLength(0);
  });

  test('target-turn duration tracks target, not source', () => {
    let state = addActiveEffect(baseState(), speedEffect({ expiration: { type: 'targetTurn', targetCombatantId: 'goblin', boundary: 'start', remainingOccurrences: 1 } }));
    state = advanceCombatTurn(state, 1);
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(state, 1);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('effect applied before source acts can expire later in same round', () => {
    let state = addActiveEffect(baseState({ activeTurn: 1, turnSequence: 2 }), speedEffect({ appliedAtTurnSequence: 2 }));
    state = advanceCombatTurn(state, 1); // goblin
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(state, 1); // barb, same cycle wrap
    expect(state.activeEffects).toHaveLength(0);
  });

  test('initiative order changes do not break id-based expiration', () => {
    let state = addActiveEffect(baseState({ participants: [{ characterId: 'barb', initiative: 1 }, { characterId: 'goblin', initiative: 30 }] }), speedEffect());
    state = normalizeCombatTimelineState({ ...state, participants: [{ characterId: 'goblin', initiative: 30 }, { characterId: 'barb', initiative: 1 }], activeTurn: 0 });
    state = advanceCombatTurn(state, 1);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('adding/removing unrelated combatants does not break expiration', () => {
    let state = addActiveEffect(baseState({ participants: [...participants, { characterId: 'owl', initiative: 9 }] }), speedEffect());
    state = { ...removeCombatantEffects(state, 'owl'), participants };
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(advanceCombatTurn(advanceCombatTurn(state, 1), 1), 1);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('removing source or target cleans up effects', () => {
    let state = addActiveEffect(baseState(), speedEffect());
    expect(removeCombatantEffects(state, 'barb').activeEffects).toHaveLength(0);
    state = addActiveEffect(baseState(), speedEffect());
    expect(removeCombatantEffects(state, 'goblin').activeEffects).toHaveLength(0);
  });

  test('refresh reapplication refreshes without stacking, while stack policy stacks', () => {
    let state = addActiveEffect(baseState(), speedEffect({ id: 'first' }));
    state = addActiveEffect(state, speedEffect({ id: 'second', appliedAtTurnSequence: 3 }));
    expect(state.activeEffects).toHaveLength(1);
    expect(state.activeEffects[0].id).toBe('first');
    expect(state.activeEffects[0].appliedAtTurnSequence).toBe(3);
    state = addActiveEffect(state, speedEffect({ id: 'stacked', stackPolicy: 'stack' }));
    expect(state.activeEffects).toHaveLength(2);
  });

  test('speed modifiers affect effective speed, preserve base speed, combine, clamp to zero, and restore on expiration', () => {
    let state = addActiveEffect(baseState(), speedEffect());
    state = addActiveEffect(state, speedEffect({ id: 'mud', stackKey: 'mud', stackPolicy: 'stack', modifiers: [{ type: 'speed', value: -20 }] }));
    expect(getEffectiveSpeed(30, state.activeEffects, 'goblin')).toBe(0);
    const character = { speed: 30, activeEffects: state.activeEffects.filter((e) => e.targetCombatantId === 'goblin') };
    expect(character.speed).toBe(30);
    expect(calculateCharacterMovementSpeed(character)).toBe(0);
    state = resolveCombatEvent(state, { type: 'turnStarted', combatantId: 'barb', round: 2, turnSequence: 4 });
    expect(calculateCharacterMovementSpeed({ speed: 30, activeEffects: state.activeEffects })).toBe(30);
  });

  test('skipped-action turns still process boundaries', () => {
    const state = resolveCombatEvent(addActiveEffect(baseState(), speedEffect()), { type: 'turnStarted', combatantId: 'barb', round: 2, turnSequence: 2, skippedActions: true });
    expect(state.activeEffects).toHaveLength(0);
  });

  test('true extra turn counts; extra action does not', () => {
    let state = addActiveEffect(baseState({ activeTurn: 1 }), speedEffect());
    state = resolveCombatEvent(state, { type: 'extraAction', combatantId: 'barb', round: 1, turnSequence: 2 });
    expect(state.activeEffects).toHaveLength(1);
    state = advanceCombatTurn(state, 1, { extraTurnCombatantId: 'barb' });
    expect(state.activeEffects).toHaveLength(0);
  });

  test('undo and saved state preserve duration behavior', () => {
    const before = addActiveEffect(baseState(), speedEffect());
    const after = advanceCombatTurn(before, 1);
    expect(after.turnSequence).toBe(2);
    const undo = before;
    expect(undo.activeEffects).toHaveLength(1);
    const restored = normalizeCombatTimelineState(JSON.parse(JSON.stringify(undo)));
    expect(advanceCombatTurn(advanceCombatTurn(advanceCombatTurn(restored, 1), 1), 1).activeEffects).toHaveLength(0);
  });

  test('multiple simultaneous expirations are deterministic', () => {
    const state = addActiveEffect(addActiveEffect(baseState(), speedEffect({ id: 'b' })), speedEffect({ id: 'a', stackKey: 'a' }));
    const resolved = resolveCombatEvent(state, { type: 'turnStarted', combatantId: 'barb', round: 2, turnSequence: 3 });
    expect(resolved.expiredEffects.map((e) => e.id)).toEqual(['a', 'b']);
  });

  test('combat-end and round-based effects expire on their documented events', () => {
    let state = addActiveEffect(baseState(), speedEffect({ id: 'combat', stackKey: 'combat', expiration: { type: 'combatEnd' } }));
    expect(endCombat(state).activeEffects).toHaveLength(0);
    state = addActiveEffect(baseState(), speedEffect({ id: 'round', expiration: buildExpirationFromDuration({ type: 'rounds', count: 1, boundary: 'end' }, { currentRound: 1 }) }));
    state = resolveCombatEvent(state, { type: 'roundStarted', round: 2 });
    expect(state.activeEffects).toHaveLength(1);
    state = resolveCombatEvent(state, { type: 'roundEnded', round: 2 });
    expect(state.activeEffects).toHaveLength(0);
  });

  test('duration definitions support source and target turn counts/manual', () => {
    expect(buildExpirationFromDuration({ type: 'sourceTurns', count: 2, boundary: 'end' }, { sourceCombatantId: 'barb' })).toMatchObject({ type: 'sourceTurn', remainingOccurrences: 2 });
    expect(buildExpirationFromDuration({ type: 'targetTurns', count: 2, boundary: 'start' }, { targetCombatantId: 'goblin' })).toMatchObject({ type: 'targetTurn', remainingOccurrences: 2 });
    expect(buildExpirationFromDuration({ type: 'permanent' })).toEqual({ type: 'manual' });
  });
});
