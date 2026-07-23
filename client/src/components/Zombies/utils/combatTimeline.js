const BOUNDARIES = new Set(['start', 'end']);
const STACK_POLICIES = new Set(['replace', 'refresh', 'stack', 'ignore']);

export const createCombatState = (state = {}) => ({
  participants: Array.isArray(state.participants) ? state.participants : [],
  activeTurn: Number.isInteger(state.activeTurn) ? state.activeTurn : null,
  round: Math.max(1, Number.isInteger(state.round) ? state.round : 1),
  turnSequence: Math.max(0, Number.isInteger(state.turnSequence) ? state.turnSequence : 0),
  activeEffects: Array.isArray(state.activeEffects) ? state.activeEffects : [],
  eventLog: Array.isArray(state.eventLog) ? state.eventLog : [],
  undoStack: Array.isArray(state.undoStack) ? state.undoStack : [],
});

const eventFor = (type, state, combatantId) => ({
  type,
  ...(combatantId ? { combatantId } : {}),
  ...(!['combatEnded'].includes(type) ? { round: state.round } : {}),
  ...(type === 'turnStarted' || type === 'turnEnded'
    ? { turnSequence: state.turnSequence }
    : {}),
});

export const durationToExpiration = (duration, { sourceCombatantId, targetCombatantId, round = 1 } = {}) => {
  switch (duration?.type) {
    case 'untilSourceTurn':
    case 'sourceTurns':
      return { type: 'sourceTurn', combatantId: sourceCombatantId, boundary: duration.boundary, remainingOccurrences: duration.count || 1 };
    case 'untilTargetTurn':
    case 'targetTurns':
      return { type: 'targetTurn', combatantId: targetCombatantId, boundary: duration.boundary, remainingOccurrences: duration.count || 1 };
    case 'rounds':
      return { type: 'rounds', expiresAtRound: round + Math.max(1, duration.count || 1), boundary: duration.boundary };
    case 'combat': return { type: 'combatEnd' };
    case 'concentration': return { type: 'concentration', concentrationId: duration.concentrationId };
    case 'permanent': return { type: 'manual' };
    default: throw new Error(`Unsupported effect duration: ${duration?.type || 'missing'}`);
  }
};

const expirationMatches = (effect, event) => {
  const expiration = effect.expiration || {};
  if (expiration.type === 'combatEnd') return event.type === 'combatEnded';
  if (expiration.type === 'rounds') {
    const type = expiration.boundary === 'end' ? 'roundEnded' : 'roundStarted';
    return event.type === type && event.round >= expiration.expiresAtRound;
  }
  if (expiration.type !== 'sourceTurn' && expiration.type !== 'targetTurn') return false;
  const type = expiration.boundary === 'end' ? 'turnEnded' : 'turnStarted';
  return event.type === type && event.combatantId === expiration.combatantId &&
    event.turnSequence > (effect.appliedAtTurnSequence ?? -1);
};

/** Resolve all effects as a batch; ids make simultaneous expiration deterministic. */
export const resolveCombatEvent = (effects, event) => {
  const expiredEffectIds = [];
  const activeEffects = [...(effects || [])].sort((a, b) => String(a.id).localeCompare(String(b.id))).flatMap((effect) => {
    if (!expirationMatches(effect, event)) return [effect];
    const expiration = effect.expiration;
    if (expiration.type === 'sourceTurn' || expiration.type === 'targetTurn') {
      const remaining = Math.max(0, (expiration.remainingOccurrences || 1) - 1);
      if (remaining > 0) return [{ ...effect, expiration: { ...expiration, remainingOccurrences: remaining } }];
    }
    expiredEffectIds.push(effect.id);
    return [];
  });
  return { activeEffects, expiredEffectIds };
};

const emit = (state, event) => {
  const resolved = resolveCombatEvent(state.activeEffects, event);
  return { ...state, activeEffects: resolved.activeEffects, eventLog: [...state.eventLog, event], lastExpiredEffectIds: resolved.expiredEffectIds };
};

export const applyActiveEffect = (inputState, effect) => {
  const state = createCombatState(inputState);
  if (!effect?.id || !effect.targetCombatantId || !effect.expiration) throw new Error('Active effects require id, targetCombatantId, and expiration');
  if ((effect.expiration.type === 'sourceTurn' || effect.expiration.type === 'targetTurn') && (!BOUNDARIES.has(effect.expiration.boundary) || !effect.expiration.combatantId)) throw new Error('Turn expiration requires a combatant and boundary');
  const normalized = { ...effect, appliedAtTurnSequence: state.turnSequence, stackPolicy: STACK_POLICIES.has(effect.stackPolicy) ? effect.stackPolicy : 'refresh' };
  const match = normalized.stackKey && state.activeEffects.findIndex((item) => item.stackKey === normalized.stackKey);
  if (match >= 0 && normalized.stackPolicy !== 'stack') {
    if (normalized.stackPolicy === 'ignore') return state;
    const next = [...state.activeEffects];
    next[match] = normalized.stackPolicy === 'refresh' ? { ...next[match], ...normalized, id: next[match].id } : normalized;
    return { ...state, activeEffects: next };
  }
  return { ...state, activeEffects: [...state.activeEffects, normalized] };
};

export const removeActiveEffect = (inputState, effectId) => {
  const state = createCombatState(inputState);
  return { ...state, activeEffects: state.activeEffects.filter((effect) => effect.id !== effectId) };
};

export const hasActiveEffect = (combatState, combatantId, definitionId) =>
  Boolean(combatantId && definitionId && (combatState?.activeEffects || []).some((effect) =>
    effect?.targetCombatantId === combatantId && effect?.definitionId === definitionId));

export const removeCombatant = (inputState, combatantId) => {
  const state = createCombatState(inputState);
  const activeId = state.participants[state.activeTurn]?.characterId;
  const participants = state.participants.filter((item) => item.characterId !== combatantId);
  const activeTurn = activeId === combatantId ? null : participants.findIndex((item) => item.characterId === activeId);
  return { ...state, participants, activeTurn: activeTurn < 0 ? null : activeTurn, activeEffects: state.activeEffects.filter((effect) => effect.targetCombatantId !== combatantId && effect.sourceCombatantId !== combatantId && effect.expiration?.combatantId !== combatantId) };
};

export const advanceTurn = (inputState, { nextCombatantId } = {}) => {
  let state = createCombatState(inputState);
  if (!state.participants.length) return state;
  const snapshot = { ...state, undoStack: undefined };
  state = { ...state, undoStack: [...state.undoStack, snapshot].slice(-20) };
  const current = state.participants[state.activeTurn];
  if (current) state = emit(state, eventFor('turnEnded', state, current.characterId));
  else state = emit(state, eventFor('roundStarted', state));
  let nextIndex = nextCombatantId ? state.participants.findIndex((item) => item.characterId === nextCombatantId) : (state.activeTurn === null ? 0 : (state.activeTurn + 1) % state.participants.length);
  if (nextIndex < 0) throw new Error('Next combatant is not in combat');
  const wrapped = Boolean(current) && !nextCombatantId && nextIndex <= state.activeTurn;
  if (wrapped) {
    state = emit(state, eventFor('roundEnded', state));
    state = { ...state, round: state.round + 1 };
    state = emit(state, eventFor('roundStarted', state));
  }
  state = { ...state, activeTurn: nextIndex, turnSequence: state.turnSequence + 1 };
  return emit(state, eventFor('turnStarted', state, state.participants[nextIndex].characterId));
};

export const undoTurn = (inputState) => {
  const state = createCombatState(inputState);
  if (!state.undoStack.length) return state;
  const snapshot = state.undoStack[state.undoStack.length - 1];
  return createCombatState({ ...snapshot, undoStack: state.undoStack.slice(0, -1) });
};

export const endCombat = (inputState) => {
  let state = createCombatState(inputState);
  state = emit(state, eventFor('combatEnded', state));
  return { ...state, activeTurn: null };
};

export const endConcentration = (inputState, concentrationId) => {
  const state = createCombatState(inputState);
  return {
    ...state,
    activeEffects: state.activeEffects.filter((effect) => effect.expiration?.type !== 'concentration' ||
      (concentrationId && effect.expiration.concentrationId !== concentrationId)),
  };
};

export const getEffectiveSpeed = (baseSpeed, effects, targetCombatantId) => Math.max(0,
  (Number(baseSpeed) || 0) + (effects || []).filter((effect) => effect.targetCombatantId === targetCombatantId).flatMap((effect) => effect.modifiers || []).filter((modifier) => modifier.type === 'speed' && modifier.operation === 'add').reduce((sum, modifier) => sum + (Number(modifier.value) || 0), 0)
);
