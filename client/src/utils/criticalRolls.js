/** Central, presentation-only critical d20 pipeline. Rollers provide the kept raw die. */
const listeners = new Set();
const seenIds = new Set();
const MAX_SEEN_IDS = 250;

export const evaluateCriticalRoll = ({ rawRoll, total, rollContext = 'custom-d20', character, source, eventId, timestamp = Date.now(), origin } = {}) => {
  const raw = Number(rawRoll);
  if (raw !== 20 && raw !== 1) return null;
  return {
    id: eventId || `critical-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    type: raw === 20 ? 'natural-20' : 'natural-1', rawRoll: raw,
    total: Number.isFinite(Number(total)) ? Number(total) : raw,
    rollContext, character: character || null, source: source || null, timestamp, origin: origin || null,
  };
};

export const emitCriticalRollEvent = (input) => {
  const event = input?.type ? input : evaluateCriticalRoll(input);
  if (!event || seenIds.has(event.id)) return null;
  seenIds.add(event.id);
  if (seenIds.size > MAX_SEEN_IDS) seenIds.delete(seenIds.values().next().value);
  listeners.forEach((listener) => listener(event));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('critical-roll-event', { detail: event }));
  return event;
};

export const subscribeToCriticalRolls = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const resetCriticalRollDeduplication = () => seenIds.clear();

export const getCriticalRollPresentation = (event) => {
  const success = event.type === 'natural-20';
  const titles = success
    ? { attack: 'CRITICAL HIT', 'saving-throw': 'PERFECT SAVE', 'death-save': 'NATURAL 20 — REVIVED', initiative: 'PERFECT INITIATIVE' }
    : { attack: 'CRITICAL MISS', 'saving-throw': 'FAILED SAVE', 'death-save': 'NATURAL 1 — TWO FAILURES' };
  return { title: titles[event.rollContext] || (success ? 'NATURAL 20' : 'NATURAL 1'), tone: success ? 'success' : 'failure' };
};
