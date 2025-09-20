import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentRack from './EquipmentRack';

describe('EquipmentRack', () => {
  test('shows slot names and allows assigning and clearing equipment', async () => {
    const onEquipmentChange = jest.fn();
    const onSlotChange = jest.fn();

    const inventory = {
      weapons: [
        { name: 'Dagger' },
        { name: 'Longsword' },
      ],
      armor: [{ name: 'Chain Mail' }],
      items: [{ name: 'Ring of Protection' }],
    };

    let equipmentState = {
      mainHand: { name: 'Dagger', source: 'weapon' },
    };

    let rerenderRack = () => {};
    const handleChange = (next) => {
      onEquipmentChange(next);
      equipmentState = next;
      rerenderRack(next);
    };

    const { rerender } = render(
      <EquipmentRack
        equipment={equipmentState}
        inventory={inventory}
        onEquipmentChange={handleChange}
        onSlotChange={onSlotChange}
      />
    );

    rerenderRack = (next) => {
      rerender(
        <EquipmentRack
          equipment={next}
          inventory={inventory}
          onEquipmentChange={handleChange}
          onSlotChange={onSlotChange}
        />
      );
    };

    expect(screen.getByText('Head')).toBeInTheDocument();
    const mainHandSelect = screen.getByLabelText('Main Hand slot selection');
    const longSwordOption = within(mainHandSelect).getByRole('option', {
      name: /Longsword/,
    });

    await userEvent.selectOptions(mainHandSelect, longSwordOption);

    expect(onSlotChange).toHaveBeenLastCalledWith(
      'mainHand',
      expect.objectContaining({ name: 'Longsword', source: 'weapon' })
    );
    expect(onEquipmentChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mainHand: expect.objectContaining({ name: 'Longsword', source: 'weapon' }),
      })
    );

    const unequippedOption = within(mainHandSelect).getByRole('option', {
      name: /^Unequipped$/,
    });

    await userEvent.selectOptions(mainHandSelect, unequippedOption);

    expect(onSlotChange).toHaveBeenLastCalledWith('mainHand', null);
    expect(onEquipmentChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ mainHand: null })
    );
  });
});
