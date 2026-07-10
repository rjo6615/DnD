import React from 'react';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('../../../utils/diceBoxManager', () => ({
  rollDiceWithBox: jest.fn(() => Promise.resolve({ rolls: [[16]] })),
  setDiceBoxThemeColor: jest.fn(),
}));

import Stats from './Stats';

const { rollDiceWithBox, setDiceBoxThemeColor } = require(
  '../../../utils/diceBoxManager'
);

beforeEach(() => {
  rollDiceWithBox.mockReset();
  rollDiceWithBox.mockImplementation(() => Promise.resolve({ rolls: [[16]] }));
  setDiceBoxThemeColor.mockReset();
});

test('clicking view shows description and breakdown', async () => {
  const form = {
    str: 10,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    race: { abilities: { str: 2 } },
    feat: [{ str: 1 }],
    equipment: {
      ringLeft: { name: 'Belt of Strength', statBonuses: { str: 1 }, source: 'item' },
    },
    item: [],
    occupation: [{ str: 1 }],
  };

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  const strengthKey = screen.getByText('STR');
  const strengthCard = strengthKey.closest('.stat-card');
  expect(strengthCard).not.toBeNull();
  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', { name: /View Strength details/i })
    );
  });

  expect(
    await screen.findByText('Physical power and carrying capacity.')
  ).toBeInTheDocument();

  const breakdownTable = screen.getByRole('table');
  const rows = within(breakdownTable).getAllByRole('row');
  const getAmountFromRow = (label) => {
    const targetRow = rows.find((row) =>
      within(row).queryByText(label, { exact: true })
    );
    expect(targetRow).toBeDefined();
    return within(targetRow).getAllByRole('cell')[1];
  };
  expect(getAmountFromRow('Base')).toHaveTextContent('9');
  expect(getAmountFromRow('Class')).toHaveTextContent('1');
  expect(getAmountFromRow('Race')).toHaveTextContent('2');
  expect(getAmountFromRow('Feat')).toHaveTextContent('1');
  expect(getAmountFromRow('Item')).toHaveTextContent('1');
  expect(getAmountFromRow('Total')).toHaveTextContent('14');
});

test('equipped stat overrides raise ability score to minimum value', async () => {
  const form = {
    str: 10,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    race: { abilities: {} },
    feat: [],
    equipment: {
      waist: {
        name: 'Belt of Hill Giant Strength',
        statOverrides: { str: 21 },
        source: 'accessory',
      },
    },
    item: [],
    occupation: [],
  };

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  const strengthKey = screen.getByText('STR');
  const strengthCard = strengthKey.closest('.stat-card');
  expect(strengthCard).not.toBeNull();
  const totalLabel = within(strengthCard).getByText('Total');
  const modifierLabel = within(strengthCard).getByText('Modifier');
  expect(totalLabel.nextElementSibling).toHaveTextContent('21');
  expect(modifierLabel.nextElementSibling).toHaveTextContent('5');

  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', { name: /View Strength details/i })
    );
  });

  const overrideRow = await screen.findByText('Override');
  const overrideCells = within(overrideRow.closest('tr')).getAllByRole('cell');
  expect(overrideCells[1]).toHaveTextContent('21');
  expect(totalLabel.nextElementSibling).toHaveTextContent('21');
});

test('stat overrides do not lower higher native scores', async () => {
  const form = {
    str: 22,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    race: { abilities: {} },
    feat: [],
    equipment: {
      waist: {
        name: 'Belt of Hill Giant Strength',
        statOverrides: { str: 21 },
        source: 'accessory',
      },
    },
    item: [],
    occupation: [],
  };

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  const strengthKey = screen.getByText('STR');
  const strengthCard = strengthKey.closest('.stat-card');
  expect(strengthCard).not.toBeNull();
  const totalLabel = within(strengthCard).getByText('Total');
  const modifierLabel = within(strengthCard).getByText('Modifier');
  expect(totalLabel.nextElementSibling).toHaveTextContent('22');
  expect(modifierLabel.nextElementSibling).toHaveTextContent('6');

  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', { name: /View Strength details/i })
    );
  });

  expect(screen.queryByText('Override')).not.toBeInTheDocument();
  expect(totalLabel.nextElementSibling).toHaveTextContent('22');
});

test('rolling a stat dispatches a roll event and closes the modal when undocked', async () => {
  const form = {
    str: 14,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    race: { abilities: {} },
    feat: [],
    item: [],
    occupation: [],
  };

  const handleCloseStats = jest.fn();
  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.75);

  render(
    <Stats
      form={form}
      showStats={true}
      handleCloseStats={handleCloseStats}
      isDocked={false}
    />
  );

  const strengthKey = screen.getByText('STR');
  const strengthCard = strengthKey.closest('.stat-card');
  expect(strengthCard).not.toBeNull();

  try {
    await act(async () => {
      await userEvent.click(
        within(strengthCard).getByRole('button', { name: /Roll Strength check/i })
      );
    });

    await waitFor(() => {
      expect(rollDiceWithBox).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(handleCloseStats).toHaveBeenCalled();
    });

    const rollEventCall = dispatchSpy.mock.calls.find(
      ([event]) => event?.type === 'damage-roll'
    );
    expect(rollEventCall).toBeDefined();
    const [rollEvent] = rollEventCall || [];
    expect(rollEvent.detail).toMatchObject({
      value: 18,
      source: 'Strength',
      breakdown: '16 (d20) + 2 Strength Modifier',
      critical: false,
      fumble: false,
      diceRolls: [
        expect.objectContaining({
          sides: 20,
          value: 16,
          type: 'Strength Check',
          category: 'base',
        }),
      ],
    });
  } finally {
    randomSpy.mockRestore();
    dispatchSpy.mockRestore();
  }
});

test('active rage grants advantage on Strength ability checks through resolver output', async () => {
  rollDiceWithBox.mockResolvedValueOnce({ rolls: [[4, 2]] });
  const form = {
    str: 16,
    dex: 14,
    con: 14,
    int: 10,
    wis: 10,
    cha: 10,
    race: { abilities: {} },
    feat: [],
    item: [],
    occupation: [{ Name: 'Barbarian', Level: 1 }],
    classState: { barbarian: { rage: { active: true, current: 1 } } },
  };
  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  const strengthCard = screen.getByText('STR').closest('.stat-card');
  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', { name: /Roll Strength check/i })
    );
  });

  await waitFor(() => {
    expect(rollDiceWithBox).toHaveBeenCalledWith([{ count: 2, sides: 20 }]);
  });
  const rollEvent = dispatchSpy.mock.calls.find(([event]) => event?.type === 'damage-roll')?.[0];
  expect(rollEvent.detail).toMatchObject({
    value: 7,
    source: 'Strength with Advantage',
    breakdown: '4 (d20) (Rolled 4 and 2) + 3 Strength Modifier',
    diceRolls: [
      expect.objectContaining({
        value: 4,
        rolls: [4, 2],
        kept: 4,
        rollMode: 'advantage',
      }),
    ],
  });
  dispatchSpy.mockRestore();
});

test('inactive rage does not grant advantage on Strength ability checks', async () => {
  const form = {
    str: 16,
    dex: 14,
    con: 14,
    int: 10,
    wis: 10,
    cha: 10,
    race: { abilities: {} },
    feat: [],
    item: [],
    occupation: [{ Name: 'Barbarian', Level: 1 }],
    classState: { barbarian: { rage: { active: false, current: 1 } } },
  };

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  await act(async () => {
    await userEvent.click(
      within(screen.getByText('STR').closest('.stat-card')).getByRole('button', { name: /Roll Strength check/i })
    );
  });
  await waitFor(() => {
    expect(rollDiceWithBox).toHaveBeenLastCalledWith([{ count: 1, sides: 20 }]);
  });
});


test('each stat card renders a heart saving throw button below the dice button with icon styling', () => {
  const form = {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    race: { abilities: {} }, feat: [], item: [], occupation: [],
  };

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  [
    ['STR', 'Strength'],
    ['DEX', 'Dexterity'],
    ['CON', 'Constitution'],
    ['INT', 'Intelligence'],
    ['WIS', 'Wisdom'],
    ['CHA', 'Charisma'],
  ].forEach(([key, label]) => {
    const card = screen.getByText(key).closest('.stat-card');
    const buttons = within(card).getAllByRole('button');
    const diceButton = within(card).getByRole('button', { name: new RegExp(`Roll ${label === 'Intelligence' ? 'Intellect' : label} check`, 'i') });
    const saveButton = within(card).getByRole('button', { name: new RegExp(`Roll ${label} saving throw`, 'i') });
    expect(saveButton).toHaveClass('stat-card-view', 'stat-card-save');
    expect(saveButton.querySelector('.fa-heart')).not.toBeNull();
    expect(buttons.indexOf(saveButton)).toBeGreaterThan(buttons.indexOf(diceButton));
  });
});

test('heart button rolls a proficient Strength saving throw through saving throw formatting', async () => {
  rollDiceWithBox.mockResolvedValueOnce({ rolls: [[4]] });
  const form = {
    str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10,
    race: { abilities: {} }, feat: [], item: [],
    occupation: [{ Name: 'Barbarian', Level: 1, savingThrows: ['str', 'con'] }],
  };
  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  await act(async () => {
    await userEvent.click(within(screen.getByText('STR').closest('.stat-card')).getByRole('button', { name: /Roll Strength saving throw/i }));
  });

  await waitFor(() => expect(rollDiceWithBox).toHaveBeenCalledWith([{ count: 1, sides: 20 }]));
  const rollEvent = dispatchSpy.mock.calls.find(([event]) => event?.type === 'damage-roll')?.[0];
  expect(rollEvent.detail).toMatchObject({
    value: 9,
    source: 'Strength Saving Throw',
    rollLabel: 'Saving Throw',
    rollType: 'savingThrow',
    breakdown: '4 (d20) + 3 Strength Modifier + 2 Proficiency Bonus',
    diceRolls: [expect.objectContaining({ type: 'Strength Saving Throw', rollType: 'savingThrow', rollMode: 'normal' })],
  });
  dispatchSpy.mockRestore();
});

test('heart button rolls non-proficient Dexterity saving throw with Danger Sense advantage', async () => {
  rollDiceWithBox.mockResolvedValueOnce({ rolls: [[20, 10]] });
  const form = {
    str: 16, dex: 16, con: 14, int: 10, wis: 10, cha: 10,
    race: { abilities: {} }, feat: [], item: [],
    occupation: [{ Name: 'Barbarian', Level: 2, savingThrows: ['str', 'con'] }],
  };
  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);

  await act(async () => {
    await userEvent.click(within(screen.getByText('DEX').closest('.stat-card')).getByRole('button', { name: /Roll Dexterity saving throw/i }));
  });

  await waitFor(() => expect(rollDiceWithBox).toHaveBeenCalledWith([{ count: 2, sides: 20 }]));
  const rollEvent = dispatchSpy.mock.calls.find(([event]) => event?.type === 'damage-roll')?.[0];
  expect(rollEvent.detail).toMatchObject({
    value: 23,
    source: 'Dexterity Saving Throw with Advantage',
    breakdown: '20 (d20) (Rolled 20 and 10) + 3 Dexterity Modifier',
    advantageSources: ['Danger Sense'],
  });
  expect(rollEvent.detail.breakdown).not.toContain('Proficiency Bonus');
  dispatchSpy.mockRestore();
});

test('dice button still makes an ability check while heart button makes a saving throw', async () => {
  rollDiceWithBox.mockResolvedValueOnce({ rolls: [[16]] }).mockResolvedValueOnce({ rolls: [[4]] });
  const form = {
    str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    race: { abilities: {} }, feat: [], item: [], occupation: [],
  };
  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

  render(<Stats form={form} showStats={true} handleCloseStats={() => {}} />);
  const card = screen.getByText('STR').closest('.stat-card');

  await act(async () => {
    await userEvent.click(within(card).getByRole('button', { name: /Roll Strength check/i }));
  });
  await act(async () => {
    await userEvent.click(within(card).getByRole('button', { name: /Roll Strength saving throw/i }));
  });

  const details = dispatchSpy.mock.calls.filter(([event]) => event?.type === 'damage-roll').map(([event]) => event.detail);
  expect(details[0]).toMatchObject({ source: 'Strength', rollLabel: 'Stat Roll' });
  expect(details[0].rollType).toBeUndefined();
  expect(details[1]).toMatchObject({ source: 'Strength Saving Throw', rollLabel: 'Saving Throw', rollType: 'savingThrow' });
  dispatchSpy.mockRestore();
});
