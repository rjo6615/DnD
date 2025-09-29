import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stats from './Stats';

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
