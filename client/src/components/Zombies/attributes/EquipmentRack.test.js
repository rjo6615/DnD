import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentRack from './EquipmentRack';
import { normalizeArmor } from './inventoryNormalization';

describe('EquipmentRack', () => {
  test('shows slot names and allows assigning and clearing equipment', async () => {
    const onEquipmentChange = jest.fn();
    const onSlotChange = jest.fn();

    const inventory = {
      weapons: [
        { name: 'Dagger', category: 'simple melee weapon' },
        { name: 'Longbow', category: 'martial ranged weapon' },
      ],
      armor: [
        { name: 'Chain Mail', category: 'heavy' },
        { name: 'Shield', category: 'shield' },
      ],
      items: [
        { name: 'Ring of Protection', category: 'Ring' },
        { name: 'Circlet of Wisdom', category: 'Head' },
        { name: 'Belt of Giant Strength', category: 'Belt' },
      ],
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

    const headSelect = screen.getByLabelText('Head slot selection');
    const headOptions = within(headSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(headOptions).toEqual([
      'Unequipped',
      'Circlet of Wisdom (Item)',
    ]);

    const waistSelect = screen.getByLabelText('Waist slot selection');
    const waistOptions = within(waistSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(waistOptions).toEqual([
      'Unequipped',
      'Belt of Giant Strength (Item)',
    ]);

    const ringSelect = screen.getByLabelText('Ring I slot selection');
    const ringOptions = within(ringSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(ringOptions).toEqual(['Unequipped', 'Ring of Protection (Item)']);

    const mainHandSelect = screen.getByLabelText('Main Hand slot selection');
    const mainHandOptions = within(mainHandSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(mainHandOptions).toEqual([
      'Unequipped',
      'Dagger (Weapon)',
      'Longbow (Weapon)',
    ]);

    const rangedSelect = screen.getByLabelText('Ranged slot selection');
    const rangedOptions = within(rangedSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(rangedOptions).toEqual(['Unequipped', 'Longbow (Weapon)']);

    const offHandSelect = screen.getByLabelText('Off Hand slot selection');
    const offHandOptions = within(offHandSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(offHandOptions).toEqual([
      'Unequipped',
      'Dagger (Weapon)',
      'Longbow (Weapon)',
      'Shield (Armor)',
    ]);

    const longbowOption = within(mainHandSelect).getByRole('option', {
      name: /Longbow/,
    });

    await userEvent.selectOptions(mainHandSelect, longbowOption);

    expect(onSlotChange).toHaveBeenLastCalledWith(
      'mainHand',
      expect.objectContaining({ name: 'Longbow', source: 'weapon' })
    );
    expect(onEquipmentChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mainHand: expect.objectContaining({ name: 'Longbow', source: 'weapon' }),
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

  test('includes armor entries that only define armorName', () => {
    const inventory = {
      armor: normalizeArmor([
        {
          armorName: 'Guardian Shield',
          category: 'shield',
        },
      ]),
    };

    render(
      <EquipmentRack
        equipment={{}}
        inventory={inventory}
        onEquipmentChange={() => {}}
        onSlotChange={() => {}}
      />
    );

    const offHandSelect = screen.getByLabelText('Off Hand slot selection');
    const offHandOptions = within(offHandSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(offHandOptions).toEqual(['Unequipped', 'Guardian Shield (Armor)']);
  });

  test('displays custom armor with slot metadata only in matching slot', () => {
    const inventory = {
      armor: normalizeArmor([
        {
          name: 'Crown of Insight',
          category: 'head',
          slot: 'Head',
          equipmentSlot: ' head ',
          slots: ['head', 'Headgear'],
          equipmentSlots: ['HEAD'],
        },
      ]),
    };

    render(
      <EquipmentRack
        equipment={{}}
        inventory={inventory}
        onEquipmentChange={() => {}}
        onSlotChange={() => {}}
      />
    );

    const headSelect = screen.getByLabelText('Head slot selection');
    const headOptions = within(headSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(headOptions).toEqual(['Unequipped', 'Crown of Insight (Armor)']);

    const chestSelect = screen.getByLabelText('Chest slot selection');
    const chestOptions = within(chestSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(chestOptions).toEqual(['Unequipped']);

    const feetSelect = screen.getByLabelText('Feet slot selection');
    const feetOptions = within(feetSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(feetOptions).toEqual(['Unequipped']);
  });

  test('accessories only appear in compatible slots', () => {
    const inventory = {
      accessories: [
        {
          name: 'Belt of Hill Giant Strength',
          category: 'belt',
          targetSlots: ['waist'],
        },
      ],
    };

    render(
      <EquipmentRack
        equipment={{}}
        inventory={inventory}
        onEquipmentChange={() => {}}
        onSlotChange={() => {}}
      />
    );

    const waistSelect = screen.getByLabelText('Waist slot selection');
    const waistOptions = within(waistSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(waistOptions).toEqual([
      'Unequipped',
      'Belt of Hill Giant Strength (Accessory)',
    ]);

    const headSelect = screen.getByLabelText('Head slot selection');
    const headOptions = within(headSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(headOptions).toEqual(['Unequipped']);

    const ringSelect = screen.getByLabelText('Ring I slot selection');
    const ringOptions = within(ringSelect)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(ringOptions).toEqual(['Unequipped']);
  });
});
