export const clampDeathCounter = (value) => Math.max(0, Math.min(3, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0));
export const defaultDeathState = () => ({ isDying: false, isDead: false, successes: 0, failures: 0, lastRoll: null, rolledThisTurn: false, startedAt: null, updatedAt: null });
export const normalizeDeathState = (state) => ({ ...defaultDeathState(), ...(state && typeof state === 'object' ? state : {}), isDying: Boolean(state?.isDying), isDead: Boolean(state?.isDead), successes: clampDeathCounter(state?.successes), failures: clampDeathCounter(state?.failures), lastRoll: Number.isInteger(Number(state?.lastRoll)) ? Number(state.lastRoll) : null, rolledThisTurn: Boolean(state?.rolledThisTurn), startedAt: typeof state?.startedAt === 'string' ? state.startedAt : null, updatedAt: typeof state?.updatedAt === 'string' ? state.updatedAt : null });
export const getDeathSaveOutcomeText = (deathState) => {
  const state = normalizeDeathState(deathState);
  if (state.isDead) return 'Dead. The DM can revive or reset this state.';
  if (state.lastRoll === 20) return 'Natural 20 — revived with 1 HP.';
  if (state.lastRoll === 1) return 'Natural 1 — two failures.';
  if (state.lastRoll >= 10) return 'Success. Three successes return you to 1 HP.';
  if (state.lastRoll) return 'Failure. Three failures mean death.';
  return 'Roll a d20. 10 or higher succeeds; natural 1 counts as two failures; natural 20 revives.';
};
