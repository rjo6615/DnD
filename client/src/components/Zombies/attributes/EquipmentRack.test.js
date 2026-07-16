import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import EquipmentRack from './EquipmentRack';

describe('EquipmentRack', () => {
  test('renders the compact equipment board without legacy SLOT_LAYOUT references', async () => {
    const handleEquipmentChange = jest.fn();

    render(
      <EquipmentRack
        equipment={{ chest: null }}
        inventory={{
          weapons: [{ name: 'Longsword', source: 'weapon', damage: '1d8' }],
          armor: [{ name: 'Chain Mail', source: 'armor', category: 'armor', acBonus: 6 }],
          items: [],
          accessories: [],
        }}
        onEquipmentChange={handleEquipmentChange}
      />
    );

    expect(screen.getByRole('heading', { name: /loadout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chest: choose equipment/i })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /chest: choose equipment/i }));
    });

    expect(screen.getByRole('dialog', { name: /chest equipment picker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chain mail/i })).toBeInTheDocument();
  });
});
