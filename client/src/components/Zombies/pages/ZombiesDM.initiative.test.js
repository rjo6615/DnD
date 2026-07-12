import { rollInitiativeD20 } from './ZombiesDM';

describe('DM initiative rolling', () => {
  it('rolls normally with one d20', () => {
    const rollD20 = jest.fn(() => 4);

    expect(rollInitiativeD20({ rollD20 })).toEqual({
      mode: 'normal',
      rolls: [4],
      kept: 4,
    });
    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  it('rolls initiative with Advantage and keeps the higher d20', () => {
    const rolls = [4, 17];
    const rollD20 = jest.fn(() => rolls.shift());

    const result = rollInitiativeD20({ rollD20, mode: 'advantage' });

    expect(result).toEqual({ mode: 'advantage', rolls: [4, 17], kept: 17 });
    expect(result.kept + 3).toBe(20);
    expect(rollD20).toHaveBeenCalledTimes(2);
  });

  it('does not roll more than two d20s for Advantage', () => {
    const rollD20 = jest.fn()
      .mockReturnValueOnce(12)
      .mockReturnValueOnce(15)
      .mockReturnValueOnce(20);

    expect(rollInitiativeD20({ rollD20, mode: 'advantage' }).kept).toBe(15);
    expect(rollD20).toHaveBeenCalledTimes(2);
  });

  it('rolls initiative with Disadvantage and keeps the lower d20', () => {
    const rolls = [17, 4];
    const rollD20 = jest.fn(() => rolls.shift());

    expect(rollInitiativeD20({ rollD20, mode: 'disadvantage' })).toEqual({
      mode: 'disadvantage',
      rolls: [17, 4],
      kept: 4,
    });
  });
});
