import { evaluateCriticalRoll, emitCriticalRollEvent, resetCriticalRollDeduplication, subscribeToCriticalRolls } from './criticalRolls';

afterEach(() => resetCriticalRollDeduplication());

test('only raw natural 20 and natural 1 produce critical events', () => {
  expect(evaluateCriticalRoll({ rawRoll: 20, total: 31 })?.type).toBe('natural-20');
  expect(evaluateCriticalRoll({ rawRoll: 1, total: 13 })?.type).toBe('natural-1');
  expect(evaluateCriticalRoll({ rawRoll: 15, total: 20 })).toBeNull();
});

test('selected advantage die emits once and discards the other die', () => {
  const listener = jest.fn(); const unsubscribe = subscribeToCriticalRolls(listener);
  emitCriticalRollEvent({ eventId: 'advantage-roll', rawRoll: 20, total: 25, rollContext: 'attack' });
  emitCriticalRollEvent({ eventId: 'advantage-roll', rawRoll: 20, total: 25, rollContext: 'attack' });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0].rawRoll).toBe(20);
  unsubscribe();
});
