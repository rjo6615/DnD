import { resolveAttack } from './attackResolution';

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
