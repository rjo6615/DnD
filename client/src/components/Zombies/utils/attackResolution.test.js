import { getAttackRollMode, resolveAttack } from './attackResolution';

const base = (naturalRoll, total) => ({
  attackerId: 'hero', targetId: 'troll',
  attack: { id: 'axe', damageType: 'slashing' },
  target: { armorClass: 15, currentHp: 10 },
  rollAttack: jest.fn().mockResolvedValue({ naturalRoll, total }),
  rollDamage: jest.fn().mockResolvedValue(7), applyDamage: jest.fn(), writeLog: jest.fn(),
});

it('makes a natural one miss without rolling or applying damage', async () => {
  const input = base(1, 99); const result = await resolveAttack(input);
  expect(result.outcome).toBe('miss'); expect(input.rollDamage).not.toHaveBeenCalled();
  expect(input.applyDamage).not.toHaveBeenCalled(); expect(result.hpAfter).toBe(10);
});

it('makes a natural twenty critical and clamps applied HP', async () => {
  const input = base(20, 3); input.rollDamage.mockResolvedValue(17);
  const result = await resolveAttack(input);
  expect(result.outcome).toBe('critical-hit'); expect(input.rollDamage).toHaveBeenCalledWith(input.attack, { critical: true });
  expect(result.hpAfter).toBe(0); expect(input.applyDamage).toHaveBeenCalledTimes(1);
});

it('hits when total equals AC', async () => {
  const result = await resolveAttack(base(10, 15));
  expect(result.outcome).toBe('hit'); expect(result.damageApplied).toBe(7);
});

it('retains Brutal Strike damage and target resolution context after damage resolves', async () => {
  const input = base(10, 15);
  input.brutalStrike = true;
  input.attack.name = 'Greataxe';
  input.rollDamage.mockResolvedValue({ total: 13, brutalStrikeDamage: 6 });
  const result = await resolveAttack(input);
  expect(result).toMatchObject({ targetId: 'troll', attackName: 'Greataxe', brutalStrikeDamage: 6, damage: 13 });
  expect(result.resolutionId).toEqual(expect.any(String));
});

it('emits authoritative damage context after HP is applied and not for zero damage', async () => {
  const input = base(10, 15);
  input.onDamageResolved = jest.fn();
  input.applyDamage.mockResolvedValue({ previousHp: 10, currentHp: 4, appliedDamage: 6 });
  await resolveAttack(input);
  expect(input.onDamageResolved).toHaveBeenCalledWith(expect.objectContaining({ sourceCombatantId: 'hero', targetCombatantId: 'troll', damageTaken: 6 }));
  expect(input.applyDamage.mock.invocationCallOrder[0]).toBeLessThan(input.onDamageResolved.mock.invocationCallOrder[0]);
});

it('logs HP returned by the canonical damage writer', async () => {
  const input = base(10, 15);
  input.applyDamage.mockResolvedValue({ previousHp: 12, currentHp: 4, appliedDamage: 8 });
  const result = await resolveAttack(input);
  expect(result).toMatchObject({ hpBefore: 12, hpAfter: 4, damageApplied: 8 });
  expect(input.writeLog).toHaveBeenCalledWith(expect.objectContaining({ hpBefore: 12, hpAfter: 4 }));
});

it('centrally grants and cancels Advantage against a Reckless target', () => {
  const combatState = { activeEffects: [{ definitionId: 'reckless-attack', targetCombatantId: 'barbarian' }] };
  expect(getAttackRollMode({ targetId: 'barbarian', combatState })).toMatchObject({
    mode: 'advantage', advantageSources: ['Target used Reckless Attack'],
  });
  expect(getAttackRollMode({ targetId: 'barbarian', combatState, disadvantageSources: ['Poisoned'] }).mode).toBe('normal');
  expect(getAttackRollMode({ targetId: 'other', combatState }).mode).toBe('normal');
});

it('passes the shared target roll mode to every attack producer', async () => {
  const input = base(10, 15);
  input.combatState = { activeEffects: [{ definitionId: 'reckless-attack', targetCombatantId: 'troll' }] };
  await resolveAttack(input);
  expect(input.rollAttack).toHaveBeenCalledWith(input.attack, expect.objectContaining({ mode: 'advantage' }));
});

it('forwards offensive source suppression to the attack producer without hiding Reckless defense', async () => {
  const input = base(10, 15);
  input.combatState = { activeEffects: [{ definitionId: 'reckless-attack', targetCombatantId: 'troll' }] };
  input.suppressedAdvantageSources = ['Reckless Attack'];
  input.brutalStrike = true;
  await resolveAttack(input);
  expect(input.rollAttack).toHaveBeenCalledWith(input.attack, expect.objectContaining({
    mode: 'advantage',
    advantageSources: ['Target used Reckless Attack'],
    suppressedAdvantageSources: ['Reckless Attack'],
    brutalStrike: true,
  }));
  expect(input.rollDamage).toHaveBeenCalledWith(input.attack, { critical: false, brutalStrike: true });
});

it('does not roll or consume a queued Brutal Strike when final Disadvantage remains', async () => {
  const input = base(10, 15);
  input.brutalStrike = true;
  input.disadvantageSources = ['Prone'];
  input.onAttackResolved = jest.fn();
  await expect(resolveAttack(input)).rejects.toThrow('Brutal Strike requires a Strength-based attack that does not have Disadvantage.');
  expect(input.rollAttack).not.toHaveBeenCalled();
  expect(input.onAttackResolved).not.toHaveBeenCalled();
});
