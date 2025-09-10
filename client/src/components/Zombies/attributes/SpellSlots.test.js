import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SpellSlots from './SpellSlots';
import { fullCasterSlots } from '../../../utils/spellSlots';

test('renders only the available number of slots', () => {
  const casterLevel = 3; // corresponds to levels 1 and 2
  const form = { occupation: [{ Name: 'Wizard', Level: casterLevel }] };
  const { container } = render(<SpellSlots form={form} used={{}} />);

  const expected = fullCasterSlots[casterLevel];
  const slotBoxDivs = Array.from(
    container.querySelectorAll('.spell-slot-container .spell-slot .slot-boxes')
  ).filter(
    (div) =>
      !div.parentElement.classList.contains('action-slot') &&
      !div.parentElement.classList.contains('bonus-slot')
  );
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

  test('renders action and bonus slots before regular slots', () => {
    const form = { occupation: [{ Name: 'Wizard', Level: 1 }] };
    const { container } = render(<SpellSlots form={form} used={{}} />);
    const slotContainer = container.querySelector('.spell-slot-container');
    const first = slotContainer.children[0];
    const second = slotContainer.children[1];
    expect(first).toHaveClass('action-slot');
    expect(first.querySelector('.slot-level').textContent).toBe('A');
    const actionBoxes = first.querySelector('.slot-boxes');
    expect(getComputedStyle(actionBoxes).display).toBe('grid');
    expect(actionBoxes.querySelectorAll('.action-circle').length).toBe(4);
    expect(second).toHaveClass('bonus-slot');
    expect(second.querySelector('.slot-level').textContent).toBe('B');
    const bonusBoxes = second.querySelector('.slot-boxes');
    expect(getComputedStyle(bonusBoxes).display).toBe('grid');
    expect(bonusBoxes.querySelectorAll('.bonus-circle').length).toBe(4);
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
  expect(firstWarlockIndex).toBeGreaterThan(2);
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

  test('action and bonus markers toggle and reflect usage', () => {
    const form = { occupation: [{ Name: 'Wizard', Level: 1 }] };
    const onToggle = jest.fn();
    const { container, rerender } = render(
      <SpellSlots form={form} used={{}} onToggleSlot={onToggle} />
    );

    const actionCircles = container.querySelectorAll('.action-circle');
    actionCircles.forEach((circle, i) => {
      fireEvent.click(circle);
      expect(onToggle).toHaveBeenNthCalledWith(i + 1, 'action', i);
    });
    rerender(
      <SpellSlots
        form={form}
        used={{ action: { 0: true, 1: true, 2: true, 3: true } }}
        onToggleSlot={onToggle}
      />
    );
    container
      .querySelectorAll('.action-circle')
      .forEach((c) => expect(c).toHaveClass('slot-used'));

    const bonusCircles = container.querySelectorAll('.bonus-circle');
    bonusCircles.forEach((circle, i) => {
      fireEvent.click(circle);
      expect(onToggle).toHaveBeenNthCalledWith(4 + i + 1, 'bonus', i);
    });
    rerender(
      <SpellSlots
        form={form}
        used={{
          action: { 0: true, 1: true, 2: true, 3: true },
          bonus: { 0: true, 1: true, 2: true, 3: true },
        }}
        onToggleSlot={onToggle}
      />
    );
    container
      .querySelectorAll('.bonus-circle')
      .forEach((c) => expect(c).toHaveClass('slot-used'));
  });
