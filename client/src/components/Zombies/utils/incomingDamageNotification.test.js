import { notifyIncomingDamage, resetIncomingDamageNotificationsForTest } from './incomingDamageNotification';

const event = { eventId: 'hit-1', sourceCombatantId: 'troll', targetCombatantId: 'barb', rolledDamage: 20, actualHpLost: 13, previousHp: 30, currentHp: 17 };
beforeEach(() => resetIncomingDamageNotificationsForTest());

test('shows authoritative damage once to the target owner using danger styling', () => {
  const notify = jest.fn();
  const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  expect(notifyIncomingDamage({ event, controlledCombatantId: 'barb', resolveCombatantName: () => 'Troll', notify, storage })).toBe(true);
  expect(notify).toHaveBeenCalledWith('Troll has dealt 13 damage to you.', 'danger');
  expect(notifyIncomingDamage({ event, controlledCombatantId: 'barb', resolveCombatantName: () => 'Troll', notify, storage })).toBe(false);
  expect(notify).toHaveBeenCalledTimes(1);
});

test('does not notify unrelated clients or zero-damage resolutions', () => {
  const notify = jest.fn();
  notifyIncomingDamage({ event, controlledCombatantId: 'attacker', notify, storage: null });
  notifyIncomingDamage({ event: { ...event, eventId: 'zero', actualHpLost: 0 }, controlledCombatantId: 'barb', notify, storage: null });
  expect(notify).not.toHaveBeenCalled();
});

test('uses another player character name and final applied damage', () => {
  const notify = jest.fn();
  notifyIncomingDamage({ event: { ...event, sourceCombatantId: 'fighter', actualHpLost: 4 }, controlledCombatantId: 'barb', resolveCombatantName: () => 'Aric', notify, storage: null });
  expect(notify).toHaveBeenCalledWith('Aric has dealt 4 damage to you.', 'danger');
});
