import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockWeaponListProps = { current: null };
const mockArmorListProps = { current: null };
const mockItemListProps = { current: null };
const mockEquipmentRackProps = { current: null };

jest.mock('../../Weapons/WeaponList', () => {
  const React = require('react');
  return (props) => {
    mockWeaponListProps.current = props;
    if (!props.show) return null;
    return (
      <div data-testid="weapon-list">
        {(props.initialWeapons || []).map((weapon) => (
          <span key={weapon.name}>{weapon.name}</span>
        ))}
      </div>
    );
  };
});

jest.mock('../../Armor/ArmorList', () => {
  const React = require('react');
  return (props) => {
    mockArmorListProps.current = props;
    if (!props.show) return null;
    return (
      <div data-testid="armor-list">
        {(props.initialArmor || []).map((armor) => (
          <span key={armor.name}>{armor.name}</span>
        ))}
      </div>
    );
  };
});

jest.mock('../../Items/ItemList', () => {
  const React = require('react');
  return (props) => {
    mockItemListProps.current = props;
    if (!props.show) return null;
    return (
      <div data-testid="item-list">
        {(props.initialItems || []).map((item) => (
          <span key={item.name}>{item.name}</span>
        ))}
      </div>
    );
  };
});

jest.mock('./EquipmentRack', () => {
  const React = require('react');
  return (props) => {
    mockEquipmentRackProps.current = props;
    if (!props) return null;
    return <div data-testid="equipment-rack" />;
  };
});

import InventoryModal from './InventoryModal';

describe('InventoryModal', () => {
  beforeEach(() => {
    mockWeaponListProps.current = null;
    mockArmorListProps.current = null;
    mockItemListProps.current = null;
    mockEquipmentRackProps.current = null;
  });

  test('switches tabs between weapons, armor, and items', async () => {
    const form = {
      weapon: [['Sword']],
      armor: [['Shield Mail']],
      item: [['Rations']],
    };

    const handleEquipmentChange = jest.fn();

    render(
      <InventoryModal
        show
        onHide={jest.fn()}
        onTabChange={jest.fn()}
        form={form}
        onEquipmentChange={handleEquipmentChange}
      />
    );

    expect(await screen.findByTestId('weapon-list')).toBeInTheDocument();
    expect(screen.queryByTestId('armor-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('item-list')).not.toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    });

    expect(await screen.findByTestId('armor-list')).toBeInTheDocument();
    expect(screen.queryByTestId('weapon-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('item-list')).not.toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Items' }));
    });

    expect(await screen.findByTestId('item-list')).toBeInTheDocument();
    expect(screen.queryByTestId('weapon-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('armor-list')).not.toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Equipment' }));
    });

    expect(await screen.findByTestId('equipment-rack')).toBeInTheDocument();
    expect(screen.queryByTestId('item-list')).not.toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Weapons',
      'Armor',
      'Items',
      'Equipment',
    ]);
  });

  test('only renders owned equipment from the form data', async () => {
    const form = {
      weapon: [
        ['Longsword', 'martial melee'],
        { name: 'Dagger', owned: true },
        { name: 'Great Axe', owned: false },
        null,
      ],
      armor: [
        ['Chain Mail', 16],
        { name: 'Leather Armor', owned: false },
      ],
      item: [
        ['Torch'],
        { name: 'Potion of Healing', owned: true },
        { name: 'Scroll', owned: false },
      ],
    };

    render(
      <InventoryModal
        show
        onHide={jest.fn()}
        onTabChange={jest.fn()}
        form={form}
      />
    );

    const weaponList = await screen.findByTestId('weapon-list');
    expect(weaponList).toHaveTextContent('Longsword');
    expect(weaponList).toHaveTextContent('Dagger');
    expect(weaponList).not.toHaveTextContent('Great Axe');

    expect(mockWeaponListProps.current?.ownedOnly).toBe(true);

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    });

    const armorList = await screen.findByTestId('armor-list');
    expect(armorList).toHaveTextContent('Chain Mail');
    expect(armorList).not.toHaveTextContent('Leather Armor');
    expect(mockArmorListProps.current?.ownedOnly).toBe(true);

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Items' }));
    });

    const itemList = await screen.findByTestId('item-list');
    expect(itemList).toHaveTextContent('Torch');
    expect(itemList).toHaveTextContent('Potion of Healing');
    expect(itemList).not.toHaveTextContent('Scroll');
    expect(mockItemListProps.current?.ownedOnly).toBe(true);
  });

  test('renders equipment rack with normalized inventory and equipment data', async () => {
    const form = {
      weapon: [['Longsword']],
      armor: [['Shield']],
      item: [['Potion']],
      equipment: {
        mainHand: { name: 'Longsword', source: 'weapon' },
      },
    };
    const handleEquipmentChange = jest.fn();

    render(
      <InventoryModal
        show
        onHide={jest.fn()}
        onTabChange={jest.fn()}
        form={form}
        onEquipmentChange={handleEquipmentChange}
      />
    );

    expect(mockEquipmentRackProps.current).toBeNull();

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Equipment' }));
    });

    expect(await screen.findByTestId('equipment-rack')).toBeInTheDocument();
    expect(mockEquipmentRackProps.current).toMatchObject({
      equipment: form.equipment,
      inventory: {
        weapons: [expect.objectContaining({ name: 'Longsword' })],
        armor: [expect.objectContaining({ name: 'Shield' })],
        items: [expect.objectContaining({ name: 'Potion' })],
      },
    });
    expect(mockEquipmentRackProps.current.onEquipmentChange).toBe(
      handleEquipmentChange
    );
  });
});
