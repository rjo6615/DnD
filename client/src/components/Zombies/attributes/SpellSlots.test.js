import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SpellSlots from './SpellSlots';
import { fullCasterSlots } from '../../../utils/spellSlots';

test('renders only the available number of slots', () => {
  const casterLevel = 3; // corresponds to levels 1 and 2
  const form = { occupation: [{ Name: 'Wizard', Level: casterLevel }] };
  const { container } = render(<SpellSlots form={form} used={{}} />);

  const expected = fullCasterSlots[casterLevel];
  const slotBoxDivs = container.querySelectorAll('.slot-boxes');
  Object.values(expected).forEach((count, idx) => {
    expect(slotBoxDivs[idx].querySelectorAll('.slot-small').length).toBe(count);
  });
});

test('reflects used slots from props and toggles via callback', () => {
  const form = { occupation: [{ Name: 'Wizard', Level: 1 }] };
  const onToggle = jest.fn();
  const { container, rerender } = render(
    <SpellSlots form={form} used={{}} onToggleSlot={onToggle} />
  );
  const first = container.querySelector('.slot-small');
  fireEvent.click(first);
  expect(onToggle).toHaveBeenCalledWith('regular', 1, 0);
  rerender(
    <SpellSlots
      form={form}
      used={{ 'regular-1': { 0: true } }}
      onToggleSlot={onToggle}
    />
  );
  expect(container.querySelector('.slot-small')).toHaveClass('slot-used');
});

test('warlock slots render after regular slots and have purple styling', () => {
  const form = {
    occupation: [
      { Name: 'Wizard', Level: 3 },
      { Name: 'Warlock', Level: 3 },
    ],
  };
  const { container } = render(<SpellSlots form={form} used={{}} />);
  const groups = Array.from(
    container.querySelectorAll('.spell-slot-container .spell-slot')
  );
  const firstWarlockIndex = groups.findIndex((g) =>
    g.classList.contains('warlock-slot')
  );
  expect(firstWarlockIndex).toBeGreaterThan(0);
  groups.slice(firstWarlockIndex).forEach((g) => {
    expect(g).toHaveClass('warlock-slot');
  });
  const style = document.createElement('style');
  style.innerHTML = '.warlock-slot .slot-active { background: #800080; }';
  document.head.appendChild(style);
  const warlockActive = container.querySelector('.warlock-slot .slot-active');
  expect(getComputedStyle(warlockActive).backgroundColor).toBe(
    'rgb(128, 0, 128)'
  );
});
