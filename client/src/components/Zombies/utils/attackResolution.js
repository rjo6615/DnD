export const INACTIVE_COMBAT_TARGETING = Object.freeze({ status: 'inactive' });

export const getAttackRollMode = ({ targetId, combatState, advantageSources = [], disadvantageSources = [], suppressedAdvantageSources = [] } = {}) => {
  const advantages = [...advantageSources];
  const disadvantages = [...disadvantageSources];
  if ((combatState?.activeEffects || []).some((effect) =>
    effect?.definitionId === 'reckless-attack' && effect?.targetCombatantId === targetId)) {
    advantages.push('Target used Reckless Attack');
  }
  const resolvedAdvantages = advantages.filter((source) => !suppressedAdvantageSources.includes(source));
  return {
    mode: resolvedAdvantages.length && !disadvantages.length ? 'advantage' : disadvantages.length && !resolvedAdvantages.length ? 'disadvantage' : 'normal',
    advantageSources: resolvedAdvantages,
    disadvantageSources: disadvantages,
    // Preserve source-level suppressions for the attack producer, which adds
    // attacker-specific sources (such as Reckless Attack) immediately before
    // the dice are rolled.
    suppressedAdvantageSources: [...suppressedAdvantageSources],
  };
};

// Rules orchestration is dependency-injected so the established dice roller, HP writer,
// and combat log remain the source of truth. Target validation and applied-damage
// processing are deliberate extension points for range/cover and resistances later.
export async function resolveAttack({
  attackerId,
  targetId,
  attack,
  target,
  rollAttack,
  rollDamage,
  applyDamage,
  writeLog,
  validateTarget = () => ({ valid: true }),
  calculateAppliedDamage = ({ rawDamage }) => rawDamage,
  combatState,
  advantageSources,
  disadvantageSources,
  suppressedAdvantageSources,
  brutalStrike,
  onAttackResolved,
  onDamageResolved,
}) {
  if (!attackerId || !targetId || !attack?.id) throw new Error('Attack participants or attack are missing.');
  const armorClass = Number(target?.armorClass);
  const hpBefore = Number(target?.currentHp);
  if (!Number.isFinite(armorClass) || !Number.isFinite(hpBefore)) throw new Error('Target AC or HP is unavailable.');
  const validation = validateTarget({ attackerId, targetId, attack, target });
  if (validation?.valid === false) throw new Error(validation.reason || 'That target is not valid.');

  const rollMode = getAttackRollMode({ targetId, combatState, advantageSources, disadvantageSources, suppressedAdvantageSources });
  if (brutalStrike) rollMode.brutalStrike = true;
  if (brutalStrike && rollMode.mode === 'disadvantage') throw new Error('Brutal Strike requires a Strength-based attack that does not have Disadvantage.');
  const rolledAttack = await rollAttack(attack, rollMode);
  const naturalRoll = Number(rolledAttack?.naturalRoll);
  const attackTotal = Number(rolledAttack?.total);
  if (!Number.isFinite(naturalRoll) || !Number.isFinite(attackTotal)) throw new Error('The attack roll could not be completed.');
  const critical = naturalRoll === 20;
  const hit = naturalRoll !== 1 && (critical || attackTotal >= armorClass);
  let rawDamage = 0;
  let damageApplied = 0;
  let brutalStrikeDamage = 0;
  if (hit) {
    const rolledDamage = await rollDamage(attack, { critical, brutalStrike });
    rawDamage = Number(typeof rolledDamage === 'object' ? rolledDamage?.total : rolledDamage);
    brutalStrikeDamage = Number(rolledDamage?.brutalStrikeDamage) || 0;
    if (!Number.isFinite(rawDamage)) throw new Error('The damage roll could not be completed.');
    damageApplied = Math.max(0, Number(calculateAppliedDamage({ rawDamage, damageType: attack.damageType, target })) || 0);
  }
  let hpAfter = Math.max(0, hpBefore - damageApplied);
  const result = {
    type: 'attack-resolution', attackerId, targetId, attackId: attack.id, attackName: attack.name || '',
    naturalRoll, attackTotal, targetArmorClass: armorClass,
    outcome: critical && hit ? 'critical-hit' : hit ? 'hit' : 'miss',
    damage: rawDamage, damageApplied, damageType: attack.damageType || '', brutalStrikeDamage,
    hpBefore, hpAfter, rollMode: rollMode.mode, advantageSources: rollMode.advantageSources,
    disadvantageSources: rollMode.disadvantageSources, timestamp: Date.now(),
    resolutionId: `${attackerId}:${targetId}:${attack.id}:${Date.now()}`,
  };
  if (hit) {
    // The HP writer owns the authoritative before/after values.  In particular,
    // callers must not log an optimistic token-only prediction as persisted HP.
    const applied = await applyDamage({ targetId, hpBefore, hpAfter, damageApplied, result });
    if (applied) {
      if (Number.isFinite(Number(applied.previousHp))) result.hpBefore = Number(applied.previousHp);
      if (Number.isFinite(Number(applied.currentHp))) result.hpAfter = Number(applied.currentHp);
      if (Number.isFinite(Number(applied.appliedDamage))) result.damageApplied = Number(applied.appliedDamage);
      hpAfter = result.hpAfter;
    }
  }
  if (result.damageApplied > 0) {
    await onDamageResolved?.({
      damageEventId: result.resolutionId,
      sourceCombatantId: attackerId,
      targetCombatantId: targetId,
      attackId: result.attackId,
      attackName: result.attackName,
      damageTaken: Math.max(0, result.hpBefore - result.hpAfter),
      sourcePosition: result.sourcePosition,
      targetPosition: result.targetPosition,
      result,
    });
  }
  await writeLog(result);
  await onAttackResolved?.({ ...result, brutalStrike: Boolean(brutalStrike) });
  return result;
}
