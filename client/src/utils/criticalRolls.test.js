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

test('campaign transport publishes locally created events and receives shared events once', () => {
  const { bindCriticalRollTransport } = require('./criticalRolls');
  const socket = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
  const received = jest.fn(); const unsubscribe = subscribeToCriticalRolls(received);
  const cleanup = bindCriticalRollTransport(socket, 'table-1');
  emitCriticalRollEvent({ eventId: 'local', rawRoll: 20, total: 24 });
  expect(socket.emit).toHaveBeenCalledWith('critical-roll:publish', expect.objectContaining({ campaignId: 'table-1' }));
  const receiver = socket.on.mock.calls.find(([event]) => event === 'critical-roll:shared')[1];
  receiver({ id: 'remote', type: 'natural-1', rawRoll: 1, total: 3 });
  expect(received).toHaveBeenCalledWith(expect.objectContaining({ id: 'remote', isRemote: true }));
  cleanup(); unsubscribe();
});
