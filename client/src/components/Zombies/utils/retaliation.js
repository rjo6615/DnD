import { getGridDistanceFeet } from './gridSpatial';
import { getActiveBarbarianSubclassFeatures, isPathOfTheBerserker } from './barbarian';

export const RETALIATION_DESCRIPTION = 'After you take damage from a creature within 5 feet, you can use your Reaction to make one melee attack against it.';
const idOf = (value) => String(value?.characterId ?? value?.combatantId ?? value?.enemyId ?? value?._id ?? value?.id ?? value ?? '');
const participants = (state) => state?.participants || [];
const inCombat = (state, id) => participants(state).some((entry) => idOf(entry) === String(id));

export const hasRetaliation = (character) => isPathOfTheBerserker(character) &&
  getActiveBarbarianSubclassFeatures(character).some((feature) => feature.id === 'berserker-retaliation');

export const isReactionAvailable = (combatState, combatantId) =>
  !combatState?.reactions?.[combatantId]?.used;

export const isRetaliationAttack = (attack) => {
  if (!attack || attack.spell || ['spell', 'cantrip'].includes(attack.kind)) return false;
  if (attack.kind === 'unarmed' || attack.isUnarmedStrike) return true;
  return attack.kind === 'weapon' && !/ranged/i.test(`${attack.category || ''} ${attack.range || ''} ${(attack.tags || []).join(' ')}`);
};

export const getRetaliationAttacks = (attacks, targetValidator = () => true) =>
  (attacks || []).filter((attack) => isRetaliationAttack(attack) && attack.available !== false && targetValidator(attack));

export const createRetaliationOpportunity = ({ combatState, character, damageEvent, sourceCombatant, targetCombatant, mapState }) => {
  const eventId = damageEvent?.damageEventId || damageEvent?.resolutionId;
  const eventSourceId = idOf(damageEvent?.sourceCombatantId || damageEvent?.attackerId);
  const sourceId = eventSourceId && idOf(sourceCombatant || eventSourceId);
  const targetId = idOf(targetCombatant || damageEvent?.targetCombatantId || damageEvent?.targetId);
  const actualHpLost = Number(damageEvent?.actualHpLost ?? damageEvent?.damageTaken ?? damageEvent?.damageApplied);
  if (!eventId || !eventSourceId || !sourceId || !targetId || sourceId !== eventSourceId || sourceId === targetId || actualHpLost <= 0) return null;
  if (!hasRetaliation(character) || !inCombat(combatState, sourceId) || !inCombat(combatState, targetId) || !isReactionAvailable(combatState, targetId)) return null;
  if (getGridDistanceFeet(sourceCombatant || sourceId, targetCombatant || targetId, mapState) > 5) return null;
  if ((combatState?.resolvedDecisionIds || []).includes(eventId) || (combatState?.pendingDecisions || []).some((item) => item.damageEventId === eventId)) return null;
  return {
    id: `retaliation:${eventId}`, type: 'retaliation', status: 'pending', damageEventId: eventId,
    sourceCombatantId: sourceId, targetCombatantId: targetId, ownerCombatantId: targetId,
    triggeringCombatantId: sourceId, attackId: damageEvent.attackId,
    attackName: damageEvent.attackName || '', actualHpLost, damageTaken: actualHpLost,
    sourceName: sourceCombatant?.name || sourceCombatant?.characterName || '',
    sourcePosition: damageEvent.sourcePosition, targetPosition: damageEvent.targetPosition,
  };
};

/** Converts the authoritative post-HP-update event into shared combat state. */
export const processRetaliationDamageEvent = ({ combatState, character, damageEvent, sourceCombatant, targetCombatant, mapState }) =>
  queueRetaliation(combatState, createRetaliationOpportunity({
    combatState, character, damageEvent, sourceCombatant, targetCombatant, mapState,
  }));

export const queueRetaliation = (state, opportunity) => opportunity ?
  { ...state, pendingDecisions: [...(state.pendingDecisions || []), opportunity] } : state;

const resolveDecision = (state, decision) => ({
  ...state,
  pendingDecisions: (state.pendingDecisions || []).filter((item) => item.id !== decision.id),
  resolvedDecisionIds: [...new Set([...(state.resolvedDecisionIds || []), decision.damageEventId])],
});

export const declineRetaliation = (state, decisionId) => {
  const decision = (state?.pendingDecisions || []).find((item) => item.id === decisionId && item.type === 'retaliation');
  return decision ? resolveDecision(state, decision) : state;
};

export const startReactionAttack = ({ combatState, decisionId, mapState, combatants, attacks }) => {
  const decision = (combatState?.pendingDecisions || []).find((item) => item.id === decisionId && item.type === 'retaliation');
  if (!decision) return { state: combatState, error: 'Retaliation is no longer available.' };
  const source = combatants?.[decision.sourceCombatantId] || participants(combatState).find((item) => idOf(item) === decision.sourceCombatantId);
  const attacker = combatants?.[decision.targetCombatantId] || participants(combatState).find((item) => idOf(item) === decision.targetCombatantId);
  if (!source || !attacker || getGridDistanceFeet(source, attacker, mapState) > 5) return { state: resolveDecision(combatState, decision), error: 'Retaliation is no longer available because the attacker is not within 5 feet.' };
  if (!isReactionAvailable(combatState, decision.targetCombatantId)) return { state: resolveDecision(combatState, decision), error: 'Your Reaction has already been used.' };
  const eligibleAttacks = getRetaliationAttacks(attacks);
  if (!eligibleAttacks.length) return { state: combatState, error: 'No eligible melee attack is currently available for Retaliation.' };
  return {
    state: { ...combatState, reactions: { ...(combatState.reactions || {}), [decision.targetCombatantId]: { used: true, usedBy: 'retaliation', usedAtRound: combatState.round } }, pendingDecisions: (combatState.pendingDecisions || []).map((item) => item.id === decisionId ? { ...item, status: 'selecting-attack' } : item) },
    attackSelection: { reactionType: 'retaliation', attackerCombatantId: decision.targetCombatantId, targetCombatantId: decision.sourceCombatantId, lockedTargetCombatantId: decision.sourceCombatantId, attacks: eligibleAttacks },
  };
};

export const completeRetaliation = (state, decisionId) => {
  const decision = (state?.pendingDecisions || []).find((item) => item.id === decisionId);
  return decision ? resolveDecision(state, decision) : state;
};
