import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import SpellSlots from './SpellSlots';
import { fullCasterSlots } from '../../../utils/spellSlots';

test('renders only the available number of slots', () => {
  const casterLevel = 3; // corresponds to levels 1 and 2
  const form = { occupation: [{ Name: 'Wizard', Level: casterLevel }] };
  const { container } = render(<SpellSlots form={form} />);

  const expected = fullCasterSlots[casterLevel];
  const slotBoxDivs = container.querySelectorAll('.slot-boxes');
  Object.values(expected).forEach((count, idx) => {
    expect(slotBoxDivs[idx].querySelectorAll('.slot-small').length).toBe(count);
  });
});

test('long rest clears all used slots', () => {
  const form = { occupation: [{ Name: 'Wizard', Level: 3 }] };
  const { container, rerender } = render(<SpellSlots form={form} />);
  const firstSlot = container.querySelector('.slot-small');
  fireEvent.click(firstSlot);
  expect(firstSlot).toHaveClass('slot-used');
  rerender(<SpellSlots form={form} longRestCount={1} />);
  expect(container.querySelector('.slot-small')).not.toHaveClass('slot-used');
});

test('short rest clears only warlock slots', () => {
  const form = {
    occupation: [
      { Name: 'Warlock', Level: 5 },
      { Name: 'Wizard', Level: 3 },
    ],
  };
  const { rerender } = render(<SpellSlots form={form} />);
  const warlockSlot = screen.getByText('III').parentElement.querySelector('.slot-small');
  const wizardSlot = screen.getByText('I').parentElement.querySelector('.slot-small');
  fireEvent.click(warlockSlot);
  fireEvent.click(wizardSlot);
  expect(warlockSlot).toHaveClass('slot-used');
  expect(wizardSlot).toHaveClass('slot-used');
  rerender(<SpellSlots form={form} shortRestCount={1} />);
  expect(screen.getByText('III').parentElement.querySelector('.slot-small')).not.toHaveClass('slot-used');
  expect(screen.getByText('I').parentElement.querySelector('.slot-small')).toHaveClass('slot-used');
});
