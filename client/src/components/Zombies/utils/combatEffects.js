const VALID_BOUNDARIES = new Set(['start', 'end']);
const VALID_STACK_POLICIES = new Set(['replace', 'refresh', 'stack', 'ignore']);

export const createEmptyCombatState = () => ({
  participants: [],
  activeTurn: null,
  round: 1,
  turnSequence: 0,
  activeEffects: [],
  lastEvents: [],
});

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBoundary = (boundary, fallback = 'start') =>
  VALID_BOUNDARIES.has(boundary) ? boundary : fallback;

export const normalizeEffectExpiration = (expiration) => {
  if (!expiration || typeof expiration !== 'object') {
    return { type: 'manual' };
  }
  switch (expiration.type) {
    case 'sourceTurn':
      return {
        type: 'sourceTurn',
        sourceCombatantId: expiration.sourceCombatantId || expiration.combatantId || null,
        boundary: normalizeBoundary(expiration.boundary),
        remainingOccurrences: Math.max(1, Math.trunc(toNumber(expiration.remainingOccurrences, 1))),
      };
    case 'targetTurn':
      return {
        type: 'targetTurn',
        targetCombatantId: expiration.targetCombatantId || expiration.combatantId || null,
        boundary: normalizeBoundary(expiration.boundary),
        remainingOccurrences: Math.max(1, Math.trunc(toNumber(expiration.remainingOccurrences, 1))),
      };
    case 'rounds':
      return {
        type: 'rounds',
        expiresAtRound: Math.max(1, Math.trunc(toNumber(expiration.expiresAtRound, 1))),
        boundary: normalizeBoundary(expiration.boundary, 'end'),
      };
    case 'combatEnd':
    case 'concentration':
    case 'manual':
      return { ...expiration, type: expiration.type };
    default:
      return { type: 'manual' };
  }
};

export const buildExpirationFromDuration = (duration, { sourceCombatantId, targetCombatantId, currentRound = 1 } = {}) => {
  if (!duration || typeof duration !== 'object') return { type: 'manual' };
  switch (duration.type) {
    case 'untilSourceTurn':
      return { type: 'sourceTurn', sourceCombatantId, boundary: normalizeBoundary(duration.boundary), remainingOccurrences: 1 };
    case 'untilTargetTurn':
      return { type: 'targetTurn', targetCombatantId, boundary: normalizeBoundary(duration.boundary), remainingOccurrences: 1 };
    case 'sourceTurns':
      return { type: 'sourceTurn', sourceCombatantId, boundary: normalizeBoundary(duration.boundary), remainingOccurrences: Math.max(1, Math.trunc(toNumber(duration.count, 1))) };
    case 'targetTurns':
      return { type: 'targetTurn', targetCombatantId, boundary: normalizeBoundary(duration.boundary), remainingOccurrences: Math.max(1, Math.trunc(toNumber(duration.count, 1))) };
    case 'rounds':
      return { type: 'rounds', expiresAtRound: Math.max(1, Math.trunc(toNumber(currentRound, 1) + toNumber(duration.count, 1))), boundary: normalizeBoundary(duration.boundary, 'end') };
    case 'combat':
      return { type: 'combatEnd' };
    case 'permanent':
      return { type: 'manual' };
    case 'concentration':
      return { type: 'concentration', concentrationId: duration.concentrationId };
    default:
      return { type: 'manual' };
  }
};

export const normalizeActiveEffect = (effect, combatState = {}) => {
  if (!effect || typeof effect !== 'object') return null;
  const id = effect.id || `${effect.definitionId || 'effect'}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const sourceCombatantId = effect.sourceCombatantId || effect.sourceCharacterId || undefined;
  const targetCombatantId = effect.targetCombatantId || effect.targetCharacterId || effect.characterId;
  return {
    ...effect,
    id,
    definitionId: effect.definitionId || effect.name || id,
    ...(sourceCombatantId ? { sourceCombatantId } : {}),
    targetCombatantId,
    appliedAtTurnSequence: Math.max(0, Math.trunc(toNumber(effect.appliedAtTurnSequence, combatState.turnSequence || 0))),
    expiration: normalizeEffectExpiration(effect.expiration),
    modifiers: Array.isArray(effect.modifiers) ? effect.modifiers : [],
    stackPolicy: VALID_STACK_POLICIES.has(effect.stackPolicy) ? effect.stackPolicy : (effect.stackKey ? 'refresh' : 'stack'),
  };
};

export const normalizeCombatTimelineState = (state = {}) => ({
  ...createEmptyCombatState(),
  ...state,
  participants: Array.isArray(state.participants) ? state.participants : [],
  activeTurn: Number.isInteger(state.activeTurn) ? state.activeTurn : null,
  round: Math.max(1, Math.trunc(toNumber(state.round, 1))),
  turnSequence: Math.max(0, Math.trunc(toNumber(state.turnSequence, 0))),
  activeEffects: Array.isArray(state.activeEffects)
    ? state.activeEffects.map((effect) => normalizeActiveEffect(effect, state)).filter(Boolean)
    : [],
  lastEvents: Array.isArray(state.lastEvents) ? state.lastEvents : [],
});

const eventIsAfterApplication = (event, effect) =>
  event.turnSequence === undefined || toNumber(event.turnSequence, 0) > toNumber(effect.appliedAtTurnSequence, 0);

const resolveEffectForEvent = (effect, event) => {
  const expiration = normalizeEffectExpiration(effect.expiration);
  if (expiration.type === 'manual' || expiration.type === 'concentration') return { effect, expired: false };
  if (expiration.type === 'combatEnd') return { effect, expired: event.type === 'combatEnded' };
  if (expiration.type === 'rounds') {
    const eventBoundary = event.type === 'roundStarted' ? 'start' : event.type === 'roundEnded' ? 'end' : null;
    return { effect, expired: eventBoundary === expiration.boundary && toNumber(event.round, 0) >= expiration.expiresAtRound };
  }
  const expectedEvent = expiration.boundary === 'start' ? 'turnStarted' : 'turnEnded';
  if (event.type !== expectedEvent || !eventIsAfterApplication(event, effect)) return { effect, expired: false };
  const expectedCombatantId = expiration.type === 'sourceTurn' ? expiration.sourceCombatantId : expiration.targetCombatantId;
  if (!expectedCombatantId || event.combatantId !== expectedCombatantId) return { effect, expired: false };
  const remaining = Math.max(1, Math.trunc(toNumber(expiration.remainingOccurrences, 1))) - 1;
  if (remaining <= 0) return { effect, expired: true };
  return { effect: { ...effect, expiration: { ...expiration, remainingOccurrences: remaining } }, expired: false };
};

export const resolveCombatEvent = (combatState, event) => {
  const state = normalizeCombatTimelineState(combatState);
  const resolved = state.activeEffects.map((effect) => resolveEffectForEvent(effect, event));
  const activeEffects = resolved.filter((entry) => !entry.expired).map((entry) => entry.effect);
  const expiredEffects = resolved.filter((entry) => entry.expired).map((entry) => entry.effect).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { ...state, activeEffects, expiredEffects, lastEvents: [...(state.lastEvents || []), event] };
};

export const applyCombatEvents = (combatState, events) =>
  (Array.isArray(events) ? events : []).reduce((state, event) => resolveCombatEvent(state, event), combatState);

export const addActiveEffect = (combatState, effect) => {
  const state = normalizeCombatTimelineState(combatState);
  const nextEffect = normalizeActiveEffect({ ...effect, appliedAtTurnSequence: effect?.appliedAtTurnSequence ?? state.turnSequence }, state);
  if (!nextEffect) return state;
  const stackKey = nextEffect.stackKey;
  const policy = nextEffect.stackPolicy;
  if (!stackKey || policy === 'stack') return { ...state, activeEffects: [...state.activeEffects, nextEffect] };
  const existingIndex = state.activeEffects.findIndex((entry) => entry.stackKey === stackKey);
  if (existingIndex === -1) return { ...state, activeEffects: [...state.activeEffects, nextEffect] };
  if (policy === 'ignore') return state;
  const activeEffects = [...state.activeEffects];
  activeEffects[existingIndex] = policy === 'refresh' ? { ...activeEffects[existingIndex], ...nextEffect, id: activeEffects[existingIndex].id } : nextEffect;
  return { ...state, activeEffects };
};

export const removeCombatantEffects = (combatState, combatantId) => {
  const state = normalizeCombatTimelineState(combatState);
  return {
    ...state,
    activeEffects: state.activeEffects.filter(
      (effect) => effect.targetCombatantId !== combatantId && effect.sourceCombatantId !== combatantId
    ),
  };
};

export const getEffectiveSpeed = (baseSpeed, effects = [], targetCombatantId) => {
  const total = (Array.isArray(effects) ? effects : []).reduce((sum, effect) => {
    if (targetCombatantId && effect?.targetCombatantId !== targetCombatantId) return sum;
    return sum + (Array.isArray(effect?.modifiers) ? effect.modifiers : []).reduce((modSum, modifier) => {
      const type = String(modifier?.type || modifier?.stat || modifier?.attribute || '').toLowerCase();
      if (type !== 'speed' && type !== 'movement' && type !== 'movementSpeed') return modSum;
      const value = toNumber(modifier.value ?? modifier.amount ?? modifier.bonus, 0);
      return modifier.operation === 'set' ? value - toNumber(baseSpeed, 0) : modSum + value;
    }, 0);
  }, toNumber(baseSpeed, 0));
  return Math.max(0, Math.trunc(total));
};

export const advanceCombatTurn = (combatState, direction = 1, { extraTurnCombatantId = null } = {}) => {
  const state = normalizeCombatTimelineState(combatState);
  const total = state.participants.length;
  if (total === 0) return { ...state, activeTurn: null };
  let nextState = state;
  const events = [];
  const active = Number.isInteger(state.activeTurn) && state.activeTurn >= 0 && state.activeTurn < total ? state.activeTurn : null;
  if (active !== null) {
    events.push({ type: 'turnEnded', combatantId: state.participants[active].characterId, round: state.round, turnSequence: state.turnSequence });
  }
  let nextIndex;
  let wrapped = false;
  if (extraTurnCombatantId) {
    nextIndex = state.participants.findIndex((p) => p.characterId === extraTurnCombatantId);
    if (nextIndex === -1) nextIndex = active ?? 0;
  } else if (active === null) {
    nextIndex = direction > 0 ? 0 : total - 1;
  } else {
    nextIndex = (active + direction + total) % total;
    wrapped = direction > 0 ? nextIndex <= active : nextIndex >= active;
  }
  let round = state.round;
  if (wrapped && direction > 0) {
    events.push({ type: 'roundEnded', round });
    round += 1;
    events.push({ type: 'roundStarted', round });
  }
  const turnSequence = state.turnSequence + 1;
  events.push({ type: 'turnStarted', combatantId: state.participants[nextIndex].characterId, round, turnSequence });
  nextState = { ...nextState, activeTurn: nextIndex, round, turnSequence };
  return applyCombatEvents(nextState, events);
};

export const endCombat = (combatState) => resolveCombatEvent(combatState, { type: 'combatEnded' });
