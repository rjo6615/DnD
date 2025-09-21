import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentModal from './EquipmentModal';
import { EQUIPMENT_SLOT_KEYS } from './equipmentSlots';

const mockEquipmentRackProps = { current: null };

jest.mock('./EquipmentRack', () => {
  const React = require('react');
  return (props) => {
    mockEquipmentRackProps.current = props;
    return <div data-testid="equipment-rack" />;
  };
});

describe('EquipmentModal', () => {
  beforeEach(() => {
    mockEquipmentRackProps.current = null;
  });

  test('renders equipment rack with normalized inventory and equipment data', async () => {
    const form = {
      weapon: [['Longsword']],
      armor: [['Shield']],
      item: [['Potion']],
      accessories: [['Belt of Dwarvenkind']],
      equipment: {
        mainHand: { name: 'Longsword', source: 'weapon' },
      },
    };
    const handleEquipmentChange = jest.fn();

    render(
      <EquipmentModal
        show
        onHide={jest.fn()}
        form={form}
        onEquipmentChange={handleEquipmentChange}
      />
    );

    expect(await screen.findByTestId('equipment-rack')).toBeInTheDocument();
    expect(mockEquipmentRackProps.current?.inventory).toMatchObject({
      weapons: [expect.objectContaining({ name: 'Longsword' })],
      armor: [expect.objectContaining({ name: 'Shield' })],
      items: [expect.objectContaining({ name: 'Potion' })],
      accessories: [expect.objectContaining({ name: 'Belt of Dwarvenkind' })],
    });

    const equipment = mockEquipmentRackProps.current?.equipment;
    expect(equipment).toBeTruthy();
    const equipmentKeys = Object.keys(equipment || {}).sort();
    expect(equipmentKeys).toEqual([...EQUIPMENT_SLOT_KEYS].sort());
    expect(equipment?.mainHand).toEqual(
      expect.objectContaining({ name: 'Longsword', source: 'weapon' })
    );
    EQUIPMENT_SLOT_KEYS.filter((key) => key !== 'mainHand').forEach((slot) => {
      expect(equipment?.[slot]).toBeNull();
    });
    expect(mockEquipmentRackProps.current.onEquipmentChange).toBe(
      handleEquipmentChange
    );
  });

  test('close button triggers onHide handler', async () => {
    const handleHide = jest.fn();

    render(
      <EquipmentModal
        show
        onHide={handleHide}
        form={{ weapon: [], armor: [], item: [], equipment: {} }}
      />
    );

    expect(await screen.findByTestId('equipment-rack')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleHide).toHaveBeenCalledTimes(1);
  });
});
