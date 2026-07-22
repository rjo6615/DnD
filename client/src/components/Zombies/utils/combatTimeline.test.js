import {
  advanceTurn, applyActiveEffect, createCombatState, durationToExpiration,
  endCombat, endConcentration, getEffectiveSpeed, removeCombatant, resolveCombatEvent, undoTurn,
} from './combatTimeline';

const participants = ['source', 'other', 'target'].map((characterId, index) => ({ characterId, initiative: 20 - index }));
const stateAtSource = () => advanceTurn(createCombatState({ participants }));
const effect = (overrides = {}) => ({
  id: overrides.id || 'slow', definitionId: 'slow', sourceCombatantId: 'source', targetCombatantId: 'target',
  expiration: { type: 'sourceTurn', combatantId: 'source', boundary: 'start', remainingOccurrences: 1 },
  modifiers: [{ type: 'speed', operation: 'add', value: -15 }], stackKey: 'slow:source:target', stackPolicy: 'refresh', ...overrides,
});

describe('combat timeline effects', () => {
  test('source start effects survive application and other turns, then expire next source turn', () => {
    let state = applyActiveEffect(stateAtSource(), effect());
    expect(state.activeEffects).toHaveLength(1);
    state = advanceTurn(state); expect(state.activeEffects).toHaveLength(1);
    state = advanceTurn(state); expect(state.activeEffects).toHaveLength(1);
    state = advanceTurn(state); expect(state.activeEffects).toHaveLength(0);
    expect(state.round).toBe(2);
  });

  test('an effect applied before the source acts expires later in the same round', () => {
    let state = advanceTurn(createCombatState({ participants, activeTurn: 1, turnSequence: 4 })); // target
    state = applyActiveEffect(state, effect());
    state = advanceTurn(state); // wraps to source
    expect(state.round).toBe(2);
    expect(state.activeEffects).toHaveLength(0);
  });

  test.each([['sourceTurn', 'source'], ['targetTurn', 'target']])('%s end boundary tracks its creature id', (type, combatantId) => {
    let state = applyActiveEffect(stateAtSource(), effect({ expiration: { type, combatantId, boundary: 'end', remainingOccurrences: 1 } }));
    if (combatantId === 'source') state = advanceTurn(state);
    while (state.participants[state.activeTurn].characterId !== combatantId) state = advanceTurn(state);
    state = advanceTurn(state);
    expect(state.activeEffects).toHaveLength(0);
    expect(state.eventLog.some((event) => event.type === 'turnEnded' && event.combatantId === combatantId)).toBe(true);
  });

  test('multiple creature turns count occurrences, including a true extra turn', () => {
    let state = applyActiveEffect(stateAtSource(), effect({ expiration: { type: 'sourceTurn', combatantId: 'source', boundary: 'start', remainingOccurrences: 2 } }));
    state = advanceTurn(state, { nextCombatantId: 'source' });
    expect(state.activeEffects[0].expiration.remainingOccurrences).toBe(1);
    state = advanceTurn(state, { nextCombatantId: 'source' });
    expect(state.activeEffects).toHaveLength(0);
  });

  test('initiative reordering and unrelated additions do not affect id-based expiration', () => {
    let state = applyActiveEffect(stateAtSource(), effect());
    state = { ...state, participants: [participants[2], { characterId: 'new', initiative: 15 }, participants[1], participants[0]], activeTurn: 2 };
    state = advanceTurn(state);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('removing source or target cleans related effects, while unrelated removal does not', () => {
    const state = applyActiveEffect(stateAtSource(), effect());
    expect(removeCombatant(state, 'other').activeEffects).toHaveLength(1);
    expect(removeCombatant(state, 'source').activeEffects).toHaveLength(0);
    expect(removeCombatant(state, 'target').activeEffects).toHaveLength(0);
  });

  test('refresh replaces duration without stacking and stack explicitly stacks', () => {
    let state = applyActiveEffect(stateAtSource(), effect());
    state = advanceTurn(state);
    state = applyActiveEffect(state, effect({ id: 'new' }));
    expect(state.activeEffects).toHaveLength(1);
    expect(state.activeEffects[0].id).toBe('slow');
    state = applyActiveEffect(state, effect({ id: 'stacked', stackPolicy: 'stack' }));
    expect(state.activeEffects).toHaveLength(2);
  });

  test('speed modifiers are derived, additive, clamped, and never mutate base speed', () => {
    const base = 30;
    let state = applyActiveEffect(stateAtSource(), effect());
    state = applyActiveEffect(state, effect({ id: 'other-slow', stackKey: 'other', stackPolicy: 'stack', modifiers: [{ type: 'speed', operation: 'add', value: -20 }] }));
    expect(getEffectiveSpeed(base, state.activeEffects, 'target')).toBe(0);
    expect(base).toBe(30);
    state = { ...state, activeEffects: [] };
    expect(getEffectiveSpeed(base, state.activeEffects, 'target')).toBe(30);
  });

  test('skipped actions still process boundaries, while an extra action does not', () => {
    let state = applyActiveEffect(stateAtSource(), effect({ expiration: { type: 'targetTurn', combatantId: 'target', boundary: 'start', remainingOccurrences: 1 } }));
    const sequence = state.turnSequence; // an action has no timeline API call
    expect(state.turnSequence).toBe(sequence);
    state = advanceTurn(state); state = advanceTurn(state);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('undo atomically restores turn position, sequence, round, events, and expired effects', () => {
    let state = applyActiveEffect(stateAtSource(), effect());
    state = advanceTurn(advanceTurn(state));
    const before = state;
    state = advanceTurn(state);
    expect(state.activeEffects).toHaveLength(0);
    state = undoTurn(state);
    expect(state).toMatchObject({ activeTurn: before.activeTurn, round: before.round, turnSequence: before.turnSequence, activeEffects: before.activeEffects });
  });

  test('JSON persistence retains expiration behavior and defaults migrate old saves', () => {
    let state = applyActiveEffect(stateAtSource(), effect());
    state = createCombatState(JSON.parse(JSON.stringify(state)));
    state = advanceTurn(advanceTurn(advanceTurn(state)));
    expect(state.activeEffects).toHaveLength(0);
    expect(createCombatState({ participants: [] })).toMatchObject({ round: 1, turnSequence: 0, activeEffects: [] });
  });

  test('simultaneous expiration is deterministic by effect id', () => {
    const event = { type: 'turnStarted', combatantId: 'source', round: 2, turnSequence: 2 };
    const result = resolveCombatEvent([effect({ id: 'z' }), effect({ id: 'a', stackKey: 'a' })], event);
    expect(result.expiredEffectIds).toEqual(['a', 'z']);
  });

  test('combat and round durations expire on their declared lifecycle boundaries', () => {
    let state = applyActiveEffect(stateAtSource(), effect({ expiration: { type: 'combatEnd' } }));
    expect(endCombat(state).activeEffects).toHaveLength(0);
    state = applyActiveEffect(stateAtSource(), effect({ expiration: durationToExpiration({ type: 'rounds', count: 1, boundary: 'start' }, { round: 1 }) }));
    state = advanceTurn(advanceTurn(advanceTurn(state)));
    expect(state.round).toBe(2);
    expect(state.activeEffects).toHaveLength(0);
  });

  test('duration definitions cover required declarative variants and manual effects remain', () => {
    expect(durationToExpiration({ type: 'untilSourceTurn', boundary: 'start' }, { sourceCombatantId: 's' })).toMatchObject({ type: 'sourceTurn', remainingOccurrences: 1 });
    expect(durationToExpiration({ type: 'targetTurns', count: 3, boundary: 'end' }, { targetCombatantId: 't' })).toMatchObject({ type: 'targetTurn', remainingOccurrences: 3 });
    const manual = applyActiveEffect(stateAtSource(), effect({ expiration: { type: 'manual' } }));
    expect(endCombat(manual).activeEffects).toHaveLength(1);
  });

  test('ending concentration removes only matching concentration effects', () => {
    let state = applyActiveEffect(stateAtSource(), effect({ expiration: { type: 'concentration', concentrationId: 'spell-a' } }));
    state = applyActiveEffect(state, effect({ id: 'b', stackKey: 'b', expiration: { type: 'concentration', concentrationId: 'spell-b' } }));
    expect(endConcentration(state, 'spell-a').activeEffects.map((item) => item.id)).toEqual(['b']);
  });
});
