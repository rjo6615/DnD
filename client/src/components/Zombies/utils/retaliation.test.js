import { createRetaliationOpportunity, declineRetaliation, getRetaliationAttacks, hasRetaliation, processRetaliationDamageEvent, queueRetaliation, startReactionAttack } from './retaliation';
import { advanceTurn, createCombatState, removeCombatant } from './combatTimeline';
import { getGridDistanceFeet } from './gridSpatial';
import { notifyIncomingDamage } from './incomingDamageNotification';

const character = (level = 10, subclass = 'path-of-the-berserker') => ({
  occupation: [{ Name: 'Barbarian', Level: level }], classState: { barbarian: { subclass } },
});
const source = { characterId: 'troll', gridX: 5, gridY: 5, size: 'large' };
const target = { characterId: 'barbarian', gridX: 4, gridY: 5, size: 'medium' };
const baseState = createCombatState({ participants: [target, source], activeTurn: 1, round: 2 });
const event = { resolutionId: 'hit-1', attackerId: 'troll', targetId: 'barbarian', attackId: 'claw', attackName: 'Claw', damageApplied: 7 };

it('grants Retaliation only to a level 10 Path of the Berserker Barbarian', () => {
  expect(hasRetaliation(character())).toBe(true);
  expect(hasRetaliation(character(9))).toBe(false);
  expect(hasRetaliation(character(10, 'other-path'))).toBe(false);
});

it('creates one post-damage opportunity for an adjacent creature', () => {
  const opportunity = createRetaliationOpportunity({ combatState: baseState, character: character(), damageEvent: event, sourceCombatant: source, targetCombatant: target });
  expect(opportunity).toMatchObject({ damageEventId: 'hit-1', sourceCombatantId: 'troll', targetCombatantId: 'barbarian', ownerCombatantId: 'barbarian', triggeringCombatantId: 'troll', damageTaken: 7 });
  const queued = queueRetaliation(baseState, opportunity);
  expect(createRetaliationOpportunity({ combatState: queued, character: character(), damageEvent: event, sourceCombatant: source, targetCombatant: target })).toBeNull();
});

it.each([
  ['player character', { characterId: 'mega-action', gridX: 5, gridY: 5 }],
  ['monster', { enemyId: 'mega-action', gridX: 5, gridY: 5 }],
])('uses the same normalized post-damage path for a %s source', (_sourceType, attacker) => {
  const defender = { characterId: 'barbarian', gridX: 4, gridY: 5 };
  const state = createCombatState({ participants: [defender, attacker], activeTurn: 1 });
  const damageEvent = {
    damageEventId: 'mega-hit', sourceCombatantId: 'mega-action', targetCombatantId: 'barbarian',
    actualHpLost: 6, attackId: 'sword', attackName: 'Sword', damageType: 'slashing',
  };
  const resolved = processRetaliationDamageEvent({
    combatState: state, character: character(), damageEvent,
    sourceCombatant: attacker, targetCombatant: defender,
  });
  expect(resolved.pendingDecisions).toHaveLength(1);
  expect(resolved.pendingDecisions[0]).toMatchObject({
    damageEventId: 'mega-hit', sourceCombatantId: 'mega-action', targetCombatantId: 'barbarian',
    ownerCombatantId: 'barbarian', status: 'pending', actualHpLost: 6,
  });
});

it('evaluates the same authoritative eventId event used by the incoming-damage notification', () => {
  const authoritativeEvent = {
    eventId: 'socket-hit', sourceCombatantId: 'troll', targetCombatantId: 'barbarian', actualHpLost: 11,
  };
  const notify = jest.fn();
  notifyIncomingDamage({
    event: authoritativeEvent, controlledCombatantId: 'barbarian',
    resolveCombatantName: () => 'Troll', notify, storage: null,
  });
  const resolved = processRetaliationDamageEvent({
    combatState: baseState, character: character(), damageEvent: authoritativeEvent,
    sourceCombatant: source, targetCombatant: target,
  });

  expect(notify).toHaveBeenCalledWith('Troll has dealt 11 damage to you.', 'danger');
  expect(resolved.pendingDecisions).toHaveLength(1);
  expect(resolved.pendingDecisions[0]).toMatchObject({
    id: 'retaliation:socket-hit', damageEventId: 'socket-hit', ownerCombatantId: 'barbarian',
    triggeringCombatantId: 'troll', status: 'pending',
  });
});

it('resolves adjacent dictionary-keyed map tokens in the shared grid coordinate space', () => {
  const mapState = { tokens: { 'mega-action': { gridX: 5, gridY: 5 }, barbarian: { gridX: 4, gridY: 5 } } };
  expect(getGridDistanceFeet({ characterId: 'mega-action' }, { characterId: 'barbarian' }, mapState)).toBe(5);
});

it.each([
  ['zero damage', { ...event, damageApplied: 0 }, source],
  ['environmental damage', { ...event, attackerId: null }, source],
  ['self damage', { ...event, attackerId: 'barbarian' }, target],
  ['distant damage', event, { ...source, gridX: 10 }],
])('does not offer Retaliation for %s', (_name, damageEvent, attacker) => {
  expect(createRetaliationOpportunity({ combatState: baseState, character: character(), damageEvent, sourceCombatant: attacker, targetCombatant: target })).toBeNull();
});

it('declining does not spend the Reaction', () => {
  const opportunity = createRetaliationOpportunity({ combatState: baseState, character: character(), damageEvent: event, sourceCombatant: source, targetCombatant: target });
  const state = declineRetaliation(queueRetaliation(baseState, opportunity), opportunity.id);
  expect(state.reactions.barbarian).toBeUndefined();
  expect(state.pendingDecisions).toHaveLength(0);
});

it('committing spends the Reaction, filters attacks, and locks the triggering target', () => {
  const opportunity = createRetaliationOpportunity({ combatState: baseState, character: character(), damageEvent: event, sourceCombatant: source, targetCombatant: target });
  const attacks = [
    { id: 'axe', kind: 'weapon', category: 'martial melee' }, { id: 'fist', kind: 'unarmed' },
    { id: 'bow', kind: 'weapon', category: 'martial ranged' }, { id: 'spell', kind: 'spell' },
  ];
  const result = startReactionAttack({ combatState: queueRetaliation(baseState, opportunity), decisionId: opportunity.id, combatants: { troll: source, barbarian: target }, attacks });
  expect(result.state.reactions.barbarian.usedBy).toBe('retaliation');
  expect(result.attackSelection).toMatchObject({ attackerCombatantId: 'barbarian', targetCombatantId: 'troll', lockedTargetCombatantId: 'troll' });
  expect(result.attackSelection.attacks.map((attack) => attack.id)).toEqual(['axe', 'fist']);
  expect(getRetaliationAttacks(attacks)).toHaveLength(2);
});

it('revalidates range before commit without spending the Reaction', () => {
  const opportunity = createRetaliationOpportunity({ combatState: baseState, character: character(), damageEvent: event, sourceCombatant: source, targetCombatant: target });
  const result = startReactionAttack({ combatState: queueRetaliation(baseState, opportunity), decisionId: opportunity.id, combatants: { troll: { ...source, gridX: 10 }, barbarian: target }, attacks: [] });
  expect(result.error).toMatch(/not within 5 feet/);
  expect(result.state.reactions.barbarian).toBeUndefined();
});

it('cleans pending decisions on removal and refreshes Reaction at start of the combatant turn', () => {
  const pending = { ...baseState, reactions: { barbarian: { used: true } }, pendingDecisions: [{ id: 'r', sourceCombatantId: 'troll', targetCombatantId: 'barbarian' }] };
  expect(removeCombatant(pending, 'troll').pendingDecisions).toHaveLength(0);
  const advanced = advanceTurn(pending, { nextCombatantId: 'barbarian' });
  expect(advanced.reactions.barbarian.used).toBe(false);
});
