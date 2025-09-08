import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SpellSlotTabs from './SpellSlotTabs';

test('renders tabs only for levels with slots', () => {
  const form = { occupation: [{ Name: 'Wizard', Level: 5 }] };
  render(<SpellSlotTabs form={form} />);
  expect(screen.getByText('I')).toBeInTheDocument();
  expect(screen.getByText('II')).toBeInTheDocument();
  expect(screen.getByText('III')).toBeInTheDocument();
  expect(screen.queryByText('IV')).toBeNull();
});

test('shows correct number of slots per level', () => {
  const form = { occupation: [{ Name: 'Wizard', Level: 5 }] };
  render(<SpellSlotTabs form={form} />);
  const lvl1 = screen.getByTestId('spell-slot-tab-1');
  expect(within(lvl1).getAllByTestId('slot').length).toBe(4);
  const lvl2 = screen.getByTestId('spell-slot-tab-2');
  expect(within(lvl2).getAllByTestId('slot').length).toBe(3);
  const lvl3 = screen.getByTestId('spell-slot-tab-3');
  expect(within(lvl3).getAllByTestId('slot').length).toBe(2);
});

