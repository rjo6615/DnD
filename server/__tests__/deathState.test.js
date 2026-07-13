const { applyHealthChange, applyDeathSaveResult, normalizeDeathState } = require('../utils/deathState');

const pc = (overrides = {}) => ({ characterName: 'Bamboo Lee', token: 'player1', tempHealth: 5, deathState: undefined, ...overrides });

describe('death save rules', () => {
  test('HP reaching 0 enters Dying', () => {
    const outcome = applyHealthChange(pc(), 0, 5);
    expect(outcome.character.tempHealth).toBe(0);
    expect(outcome.character.deathState).toMatchObject({ isDying: true, isDead: false, successes: 0, failures: 0 });
  });
  test('10 adds one success and 9 adds one failure', () => {
    const dying = applyHealthChange(pc(), 0, 5).character;
    expect(applyDeathSaveResult(dying, 10).character.deathState.successes).toBe(1);
    expect(applyDeathSaveResult(dying, 9).character.deathState.failures).toBe(1);
  });
  test('natural 1 adds two failures and clamps at 3', () => {
    const dying = { ...applyHealthChange(pc(), 0, 5).character, deathState: { isDying: true, failures: 2 } };
    const outcome = applyDeathSaveResult(dying, 1);
    expect(outcome.character.deathState.failures).toBe(3);
    expect(outcome.character.deathState.isDead).toBe(true);
  });
  test('natural 20 revives at 1 HP', () => {
    const outcome = applyDeathSaveResult(applyHealthChange(pc(), 0, 5).character, 20);
    expect(outcome.character.tempHealth).toBe(1);
    expect(outcome.character.deathState.isDying).toBe(false);
  });
  test('three successes revive at 1 HP and three failures mark dead', () => {
    const success = applyDeathSaveResult({ ...applyHealthChange(pc(), 0, 5).character, deathState: { isDying: true, successes: 2 } }, 14);
    expect(success.character.tempHealth).toBe(1);
    const fail = applyDeathSaveResult({ ...applyHealthChange(pc(), 0, 5).character, deathState: { isDying: true, failures: 2 } }, 2);
    expect(fail.character.tempHealth).toBe(0);
    expect(fail.character.deathState.isDead).toBe(true);
  });
  test('healing clears Dying state and repeated zero-HP resets counters', () => {
    const dying = { ...applyHealthChange(pc(), 0, 5).character, deathState: { isDying: true, successes: 2, failures: 1 } };
    const healed = applyHealthChange(dying, 3, 0).character;
    expect(healed.deathState).toMatchObject({ isDying: false, successes: 0, failures: 0 });
    const dyingAgain = applyHealthChange(healed, 0, 3).character;
    expect(dyingAgain.deathState).toMatchObject({ isDying: true, successes: 0, failures: 0 });
  });
  test('duplicate roll requests are ignored and state normalizes after reload', () => {
    const rolled = applyDeathSaveResult(applyHealthChange(pc(), 0, 5).character, 12).character;
    const duplicate = applyDeathSaveResult(rolled, 12);
    expect(duplicate.ignored).toBe(true);
    expect(normalizeDeathState({ ...rolled.deathState, successes: 99, failures: -4 }).successes).toBe(3);
  });
});
