import React from 'react';
import { render, act } from '@testing-library/react';

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
});
