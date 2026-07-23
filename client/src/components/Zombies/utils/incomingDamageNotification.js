const memoryHandled = new Set();

const handledKey = (event) => `incomingDamage:${event.eventId}:${event.targetCombatantId}`;

/** Present one authoritative, persisted damage event to its controlling player. */
export const notifyIncomingDamage = ({ event, controlledCombatantId, resolveCombatantName, notify, storage = typeof window !== 'undefined' ? window.sessionStorage : null }) => {
  const actualHpLost = Number(event?.actualHpLost);
  if (!event?.eventId || !event?.targetCombatantId || actualHpLost <= 0
    || String(controlledCombatantId || '') !== String(event.targetCombatantId)) return false;
  const key = handledKey(event);
  if (memoryHandled.has(key) || storage?.getItem(key) === '1') return false;
  const attackerName = event.sourceCombatantId ? resolveCombatantName?.(event.sourceCombatantId) : event.sourceLabel;
  notify(attackerName ? `${attackerName} has dealt ${actualHpLost} damage to you.` : `You took ${actualHpLost} damage.`, 'danger');
  memoryHandled.add(key);
  try { storage?.setItem(key, '1'); } catch (error) { /* In-memory deduplication remains available. */ }
  return true;
};

export const resetIncomingDamageNotificationsForTest = () => memoryHandled.clear();
