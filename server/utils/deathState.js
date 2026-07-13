const clamp = (value) => Math.max(0, Math.min(3, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0));

const defaultDeathState = () => ({
  isDying: false,
  isDead: false,
  successes: 0,
  failures: 0,
  lastRoll: null,
  rolledThisTurn: false,
  startedAt: null,
  updatedAt: null,
});

const normalizeDeathState = (state) => ({
  ...defaultDeathState(),
  ...(state && typeof state === 'object' ? state : {}),
  isDying: Boolean(state?.isDying),
  isDead: Boolean(state?.isDead),
  successes: clamp(state?.successes),
  failures: clamp(state?.failures),
  lastRoll: Number.isInteger(Number(state?.lastRoll)) ? Math.max(1, Math.min(20, Number(state.lastRoll))) : null,
  rolledThisTurn: Boolean(state?.rolledThisTurn),
  startedAt: typeof state?.startedAt === 'string' ? state.startedAt : null,
  updatedAt: typeof state?.updatedAt === 'string' ? state.updatedAt : null,
});

const canUseDeathSaves = (character = {}) => character.deathSavesEnabled === true || character.isPlayerCharacter === true || character.type === 'player' || character.token;
const logEntry = (message, type = 'death-save') => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, message, createdAt: new Date().toISOString() });
const result = (character, event, message, extra = {}) => ({ character, event, message, log: message ? logEntry(message, event) : null, ...extra });

const enterDyingState = (character, now = new Date().toISOString()) => {
  if (!canUseDeathSaves(character) || normalizeDeathState(character.deathState).isDead) return result(character, 'none', null);
  const state = normalizeDeathState(character.deathState);
  if (state.isDying) return result({ ...character, tempHealth: 0, deathState: state }, 'none', null);
  const name = character.characterName || character.name || 'A character';
  return result({ ...character, tempHealth: 0, deathState: { ...defaultDeathState(), isDying: true, startedAt: now, updatedAt: now } }, 'dying', `${name} is dying and must make death saves.`);
};

const clearDeathState = (character) => ({ ...character, deathState: defaultDeathState() });
const reviveCharacter = (character, hp = 1, reason = 'revived') => {
  const name = character.characterName || character.name || 'A character';
  return result({ ...clearDeathState(character), tempHealth: Math.max(1, Math.trunc(Number(hp) || 1)) }, 'revived', reason === 'natural20' ? `Natural 20! ${name} rises again.` : `${name} has returned to the fight with 1 HP.`);
};
const markCharacterDead = (character) => {
  const name = character.characterName || character.name || 'A character';
  return result({ ...character, tempHealth: 0, deathState: { ...normalizeDeathState(character.deathState), isDying: false, isDead: true, failures: 3, rolledThisTurn: true, updatedAt: new Date().toISOString() } }, 'dead', `${name} has died.`);
};

const evaluateDeathState = (character) => {
  const state = normalizeDeathState(character.deathState);
  if (state.failures >= 3) return markCharacterDead({ ...character, deathState: state });
  if (state.successes >= 3) return reviveCharacter({ ...character, deathState: state }, 1, 'three-successes');
  return result({ ...character, deathState: state }, 'pending', null);
};

const applyDeathSaveResult = (character, roll, { allowDuplicate = false } = {}) => {
  const state = normalizeDeathState(character.deathState);
  const name = character.characterName || character.name || 'A character';
  if (!state.isDying || state.isDead) return result(character, 'ignored', `${name} cannot roll death saves now.`, { ignored: true });
  if (state.rolledThisTurn && !allowDuplicate) return result(character, 'duplicate', `${name} has already rolled a death save this turn.`, { ignored: true });
  const d20 = Math.max(1, Math.min(20, Math.trunc(Number(roll) || 1)));
  if (d20 === 20) return reviveCharacter({ ...character, deathState: { ...state, lastRoll: 20, rolledThisTurn: true } }, 1, 'natural20');
  let successes = state.successes;
  let failures = state.failures;
  let rollMessage;
  if (d20 === 1) { failures = clamp(failures + 2); rollMessage = `${name} rolled a natural 1: Two Death Save Failures.`; }
  else if (d20 >= 10) { successes = clamp(successes + 1); rollMessage = `${name} rolled a ${d20}: Death Save Success.`; }
  else { failures = clamp(failures + 1); rollMessage = `${name} rolled a ${d20}: Death Save Failure.`; }
  const next = { ...character, deathState: { ...state, successes, failures, lastRoll: d20, rolledThisTurn: true, updatedAt: new Date().toISOString() } };
  const evaluated = evaluateDeathState(next);
  if (evaluated.event === 'revived') evaluated.message = `${name} reached three successful death saves and revived with 1 HP.`;
  if (evaluated.event === 'dead') evaluated.message = `${name} reached three failed death saves and died.`;
  return { ...evaluated, rollLog: logEntry(rollMessage), log: evaluated.message ? logEntry(evaluated.message, evaluated.event) : null };
};

const applyHealthChange = (character, nextHp, previousHp = character.tempHealth) => {
  const hp = Math.max(0, Math.trunc(Number(nextHp) || 0));
  const prev = Number(previousHp);
  const state = normalizeDeathState(character.deathState);
  const updated = { ...character, tempHealth: hp };
  if (hp > 0 && (state.isDying || state.isDead)) return reviveCharacter(updated, hp, 'healed');
  if (state.isDead) return result({ ...updated, deathState: state }, 'none', null);
  if (hp <= 0 && canUseDeathSaves(character) && (!Number.isFinite(prev) || prev > 0 || !state.isDying)) return enterDyingState(updated);
  return result({ ...updated, deathState: state }, 'none', null);
};

module.exports = { defaultDeathState, normalizeDeathState, enterDyingState, applyDeathSaveResult, applyHealthChange, reviveCharacter, markCharacterDead, clearDeathState, evaluateDeathState, clamp };
