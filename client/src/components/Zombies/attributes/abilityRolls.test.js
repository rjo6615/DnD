import {
  resolveAbilityCheckRollMode,
  rollSkillWithDiceBox,
} from './Skills';
import { rollDiceWithBox } from '../../../utils/diceBoxManager';

jest.mock('../../../utils/diceBoxManager', () => ({
  rollDiceWithBox: jest.fn(),
  setDiceBoxThemeColor: jest.fn(),
}));

const ragingBarbarian = {
  occupation: [{ Name: 'Barbarian', Level: 1 }],
  classState: { barbarian: { rage: { active: true, current: 1 } } },
};

describe('ability check advantage resolution', () => {
  beforeEach(() => {
    rollDiceWithBox.mockReset();
  });

  test('rage applies only to active Strength ability checks', () => {
    expect(resolveAbilityCheckRollMode(ragingBarbarian, 'str').mode).toBe('advantage');
    expect(resolveAbilityCheckRollMode({ ...ragingBarbarian, classState: { barbarian: { rage: { active: false } } } }, 'str').mode).toBe('normal');
    expect(resolveAbilityCheckRollMode(ragingBarbarian, 'dex').mode).toBe('normal');
    expect(resolveAbilityCheckRollMode(ragingBarbarian, 'con').mode).toBe('normal');
  });

  test('multiple advantage sources roll two d20s and keep the higher', async () => {
    rollDiceWithBox.mockResolvedValueOnce({ rolls: [[4, 2]] });
    const result = await rollSkillWithDiceBox(3, { rollMode: 'advantage' });
    expect(rollDiceWithBox).toHaveBeenCalledWith([{ count: 2, sides: 20 }]);
    expect(result).toMatchObject({ result: 7, d20: 4, rolledD20s: [4, 2], keptD20: 4, rollMode: 'advantage' });
  });

  test('disadvantage rolls two d20s and keeps the lower', async () => {
    rollDiceWithBox.mockResolvedValueOnce({ rolls: [[4, 2]] });
    const result = await rollSkillWithDiceBox(3, { rollMode: 'disadvantage' });
    expect(result).toMatchObject({ result: 5, d20: 2, rolledD20s: [4, 2], keptD20: 2, rollMode: 'disadvantage' });
  });

  test('advantage and disadvantage cancel to one d20', () => {
    const resolved = resolveAbilityCheckRollMode(ragingBarbarian, 'str', {
      advantageSources: ['Help'],
      disadvantageSources: ['Poisoned'],
    });
    expect(resolved.mode).toBe('normal');
  });
});
