import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stats from './Stats';

const getBreakdownModal = () => {
  const dialogs = screen.getAllByRole('dialog');
  return dialogs.find((dialog) =>
    within(dialog).queryByText(/Breakdown$/i)
  );
};

const getBreakdownRow = (label) => {
  const modal = getBreakdownModal();
  const table = within(modal).getByRole('table');
  return within(table).getByText(label).closest('tr');
};

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

  const strengthCard = screen.getByTestId('stat-card-str');
  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', {
        name: 'View Strength details',
      })
    );
  });

  expect(
    await screen.findByText('Physical power and carrying capacity.')
  ).toBeInTheDocument();

  const baseRow = getBreakdownRow('Base');
  expect(within(baseRow).getByText('9')).toBeInTheDocument();
  const classRow = getBreakdownRow('Class');
  expect(within(classRow).getByText('1')).toBeInTheDocument();
  const raceRow = getBreakdownRow('Race');
  expect(within(raceRow).getByText('2')).toBeInTheDocument();
  const featRow = getBreakdownRow('Feat');
  expect(within(featRow).getByText('1')).toBeInTheDocument();
  const itemRow = getBreakdownRow('Item');
  expect(within(itemRow).getByText('1')).toBeInTheDocument();
  const totalRow = getBreakdownRow('Total');
  expect(within(totalRow).getByText('14')).toBeInTheDocument();
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

  const strengthCard = screen.getByTestId('stat-card-str');
  const totalMetric = within(strengthCard)
    .getByText('Total')
    .closest('.stat-card-metric');
  expect(within(totalMetric).getByText('21')).toBeInTheDocument();
  const modifierMetric = within(strengthCard)
    .getByText('Modifier')
    .closest('.stat-card-metric');
  expect(within(modifierMetric).getByText('5')).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', {
        name: 'View Strength details',
      })
    );
  });

  const overrideRow = await screen.findByText('Override');
  const overrideCells = within(overrideRow.closest('tr')).getAllByRole('cell');
  expect(overrideCells[1]).toHaveTextContent('21');
  const totalRow = getBreakdownRow('Total');
  expect(within(totalRow).getByText('21')).toBeInTheDocument();
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

  const strengthCard = screen.getByTestId('stat-card-str');
  const totalMetric = within(strengthCard)
    .getByText('Total')
    .closest('.stat-card-metric');
  expect(within(totalMetric).getByText('22')).toBeInTheDocument();
  const modifierMetric = within(strengthCard)
    .getByText('Modifier')
    .closest('.stat-card-metric');
  expect(within(modifierMetric).getByText('6')).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      within(strengthCard).getByRole('button', {
        name: 'View Strength details',
      })
    );
  });

  expect(screen.queryByText('Override')).not.toBeInTheDocument();
  const totalRow = getBreakdownRow('Total');
  expect(within(totalRow).getByText('22')).toBeInTheDocument();
});
