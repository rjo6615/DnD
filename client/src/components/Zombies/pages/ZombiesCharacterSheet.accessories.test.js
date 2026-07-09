import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

import AccessoryList from '../../Accessories/AccessoryList';

const createDeferredResponse = (data) => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = () =>
      res({
        ok: true,
        json: async () => data,
      });
  });
  return { promise, resolve };
};

const AccessoryHarness = React.forwardRef((_, ref) => {
  const [accessories, setAccessories] = React.useState([]);

  React.useImperativeHandle(ref, () => ({
    addAccessory: (accessory) => {
      setAccessories((prev) => [...prev, accessory]);
    },
    getAccessories: () => accessories,
  }));

  return (
    <AccessoryList
      campaign="test-campaign"
      initialAccessories={accessories}
      onChange={setAccessories}
      show
    />
  );
});
AccessoryHarness.displayName = 'AccessoryHarness';

describe('AccessoryList request handling', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  test('keeps purchased accessory when earlier fetch resolves later', async () => {
    const srdData = {
      'amulet of swiftness': {
        name: 'amulet of swiftness',
        displayName: 'Amulet of Swiftness',
        category: 'amulet',
        targetSlots: ['neck'],
        rarity: 'uncommon',
        weight: 1,
        cost: '50 gp',
        statBonuses: { dex: 1 },
        skillBonuses: {},
      },
    };

    const srdDeferred = createDeferredResponse(srdData);
    let accessoriesRequestCount = 0;

    apiFetch.mockImplementation((url) => {
      if (url === '/accessories') {
        accessoriesRequestCount += 1;
        if (accessoriesRequestCount === 1) {
          return srdDeferred.promise;
        }
        return new Promise(() => {});
      }
      if (url === '/equipment/accessories/test-campaign') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      throw new Error(`Unexpected apiFetch call: ${url}`);
    });

    const harnessRef = React.createRef();
    render(<AccessoryHarness ref={harnessRef} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(accessoriesRequestCount).toBe(1);

    const purchasedAccessory = {
      name: 'amulet of swiftness',
      displayName: 'Amulet of Swiftness',
      category: 'amulet',
      targetSlots: ['neck'],
      rarity: 'uncommon',
      weight: 1,
      cost: '50 gp',
      statBonuses: { dex: 1 },
      skillBonuses: {},
      owned: true,
    };

    await act(async () => {
      harnessRef.current.addAccessory(purchasedAccessory);
    });

    let accessories = harnessRef.current.getAccessories();
    let ownedAccessory = accessories.find((entry) => entry?.name === 'amulet of swiftness');
    expect(ownedAccessory).toBeTruthy();
    expect(ownedAccessory.owned).toBe(true);

    await act(async () => {
      srdDeferred.resolve();
      await Promise.resolve();
    });

    accessories = harnessRef.current.getAccessories();
    ownedAccessory = accessories.find((entry) => entry?.name === 'amulet of swiftness');
    expect(ownedAccessory).toBeTruthy();
    expect(ownedAccessory.owned).toBe(true);
  });

  test('delete button removes an accessory after confirmation', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === '/accessories') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            'amulet of swiftness': {
              name: 'amulet of swiftness',
              displayName: 'Amulet of Swiftness',
              category: 'amulet',
              targetSlots: ['neck'],
              weight: 1,
              cost: '50 gp',
              statBonuses: {},
              skillBonuses: {},
            },
          }),
        });
      }
      if (url === '/equipment/accessories/Camp1') {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      throw new Error(`Unexpected apiFetch call: ${url}`);
    });

    const onChange = jest.fn();
    const initialAccessories = [
      { name: 'amulet of swiftness', displayName: 'Amulet of Swiftness', owned: true },
      { name: 'amulet of swiftness', displayName: 'Amulet of Swiftness', owned: true },
      { name: 'ring of protection', displayName: 'Ring of Protection', owned: true },
    ];

    render(
      <AccessoryList
        campaign="Camp1"
        initialAccessories={initialAccessories}
        ownedOnly
        embedded
        onChange={onChange}
        show
      />
    );

    const amuletHeadings = await screen.findAllByText('Amulet of Swiftness');
    const amuletCard = amuletHeadings[0]?.closest('.card');
    expect(amuletCard).not.toBeNull();

    const deleteButton = within(amuletCard).getByRole('button', {
      name: /delete amulet of swiftness/i,
    });

    await act(async () => {
      await userEvent.click(deleteButton);
    });

    const confirmationMessage = await screen.findByText(
      /are you sure you want to remove amulet of swiftness from your inventory/i
    );
    const confirmationModal = confirmationMessage.closest('.modal');
    expect(confirmationModal).not.toBeNull();

    const confirmButton = within(confirmationModal).getByRole('button', {
      name: /delete/i,
    });

    await act(async () => {
      await userEvent.click(confirmButton);
    });

    await waitFor(() =>
      expect(
        onChange.mock.calls.some(([entries]) => {
          if (!Array.isArray(entries)) {
            return false;
          }
          const amuletCopies = entries.filter(
            (entry) => entry?.name === 'amulet of swiftness'
          ).length;
          return entries.length === 2 && amuletCopies === 1;
        })
      ).toBe(true)
    );
    const deletionCall = onChange.mock.calls.find(([entries]) => {
      if (!Array.isArray(entries)) {
        return false;
      }
      const amuletCopies = entries.filter(
        (entry) => entry?.name === 'amulet of swiftness'
      ).length;
      return entries.length === 2 && amuletCopies === 1;
    });
    const [updatedAccessories] = deletionCall || [];
    expect(Array.isArray(updatedAccessories)).toBe(true);
    expect(updatedAccessories).toHaveLength(2);

    await waitFor(() =>
      expect(
        screen.queryByText(
          /are you sure you want to remove amulet of swiftness from your inventory/i
        )
      ).not.toBeInTheDocument()
    );
  });
});
