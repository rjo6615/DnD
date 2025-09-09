import React from 'react';
import { render } from '@testing-library/react';
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
