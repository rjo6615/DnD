export const INACTIVE_COMBAT_TARGETING = Object.freeze({ status: 'inactive' });

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
}) {
  if (!attackerId || !targetId || !attack?.id) throw new Error('Attack participants or attack are missing.');
  const armorClass = Number(target?.armorClass);
  const hpBefore = Number(target?.currentHp);
  if (!Number.isFinite(armorClass) || !Number.isFinite(hpBefore)) throw new Error('Target AC or HP is unavailable.');
  const validation = validateTarget({ attackerId, targetId, attack, target });
  if (validation?.valid === false) throw new Error(validation.reason || 'That target is not valid.');

  const rolledAttack = await rollAttack(attack);
  const naturalRoll = Number(rolledAttack?.naturalRoll);
  const attackTotal = Number(rolledAttack?.total);
  if (!Number.isFinite(naturalRoll) || !Number.isFinite(attackTotal)) throw new Error('The attack roll could not be completed.');
  const critical = naturalRoll === 20;
  const hit = naturalRoll !== 1 && (critical || attackTotal >= armorClass);
  let rawDamage = 0;
  let damageApplied = 0;
  if (hit) {
    rawDamage = Number(await rollDamage(attack, { critical }));
    if (!Number.isFinite(rawDamage)) throw new Error('The damage roll could not be completed.');
    damageApplied = Math.max(0, Number(calculateAppliedDamage({ rawDamage, damageType: attack.damageType, target })) || 0);
  }
  const hpAfter = Math.max(0, hpBefore - damageApplied);
  const result = {
    type: 'attack-resolution', attackerId, targetId, attackId: attack.id,
    naturalRoll, attackTotal, targetArmorClass: armorClass,
    outcome: critical && hit ? 'critical-hit' : hit ? 'hit' : 'miss',
    damage: rawDamage, damageApplied, damageType: attack.damageType || '',
    hpBefore, hpAfter, timestamp: Date.now(),
  };
  if (hit) await applyDamage({ targetId, hpBefore, hpAfter, damageApplied, result });
  await writeLog(result);
  return result;
}
