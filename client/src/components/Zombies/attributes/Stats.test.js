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

  const strengthRow = screen.getByText('STR').closest('tr');
  await act(async () => {
    await userEvent.click(
      within(strengthRow).getByRole('button', { name: /view/i })
    );
  });

  expect(
    await screen.findByText('Physical power and carrying capacity.')
  ).toBeInTheDocument();

  const baseRow = screen.getByText('Base').closest('tr');
  expect(within(baseRow).getByText('9')).toBeInTheDocument();
  const classRow = screen.getByText('Class').closest('tr');
  expect(within(classRow).getByText('1')).toBeInTheDocument();
  const raceRow = screen.getByText('Race').closest('tr');
  expect(within(raceRow).getByText('2')).toBeInTheDocument();
  const featRow = screen.getByText('Feat').closest('tr');
  expect(within(featRow).getByText('1')).toBeInTheDocument();
  const itemRow = screen.getByText('Item').closest('tr');
  expect(within(itemRow).getByText('1')).toBeInTheDocument();
  const totalRow = screen.getByText('Total').closest('tr');
  expect(within(totalRow).getByText('14')).toBeInTheDocument();
});
