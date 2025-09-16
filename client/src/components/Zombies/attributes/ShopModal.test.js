import React from 'react';
import {
  render,
  screen,
  waitFor,
  act,
  within,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockWeaponListFetch = jest.fn();
const mockArmorListFetch = jest.fn();
const mockItemListFetch = jest.fn();

const mockWeapon = { name: 'Mock Weapon', type: 'weapon', cost: '1 gp' };
const mockArmor = { name: 'Mock Armor', type: 'armor', cost: '1 pp 2 gp' };
const mockItem = { name: 'Mock Item', type: 'item', cost: '3 sp 4 cp' };

const escapeRegExp = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const TEST_COIN_VALUES = { cp: 1, sp: 10, gp: 100, pp: 1000 };
const NUMBER_PATTERN = /^[-+]?\d*\.?\d+$/;

const costStringToCp = (cost) => {
  if (!cost) return 0;
  const normalized = String(cost).toLowerCase();

  let total = 0;
  const regex = /(-?\d*\.?\d+)\s*(pp|gp|sp|cp)/g;
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(normalized))) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    const multiplier = TEST_COIN_VALUES[unit];
    if (!Number.isNaN(value) && multiplier) {
      total += value * multiplier;
    }
  }

  if (
    total === 0 &&
    NUMBER_PATTERN.test(normalized.replace(/,/g, '')) &&
    !/[a-z]/.test(normalized)
  ) {
    const numericValue = parseFloat(normalized.replace(/,/g, ''));
    if (!Number.isNaN(numericValue)) {
      total = numericValue * TEST_COIN_VALUES.gp;
    }
  }

  return Math.round(total);
};

const formatCoinsFromCp = (cp) => {
  const value = Number.isFinite(cp) ? cp : 0;
  const isNegative = value < 0;
  let remaining = Math.abs(Math.round(value));

  const pp = Math.floor(remaining / TEST_COIN_VALUES.pp);
  remaining -= pp * TEST_COIN_VALUES.pp;
  const gp = Math.floor(remaining / TEST_COIN_VALUES.gp);
  remaining -= gp * TEST_COIN_VALUES.gp;
  const sp = Math.floor(remaining / TEST_COIN_VALUES.sp);
  remaining -= sp * TEST_COIN_VALUES.sp;
  const cpValue = remaining;

  const prefix = isNegative ? '-' : '';

  return `${prefix}PP ${pp} • GP ${gp} • SP ${sp} • CP ${cpValue}`;
};

jest.mock('../../Weapons/WeaponList', () => {
  const React = require('react');
  const WeaponListMock = (props) => {
    const prevShowRef = React.useRef(false);
    React.useEffect(() => {
      if (props.show && !prevShowRef.current) {
        mockWeaponListFetch();
      }
      prevShowRef.current = props.show;
    }, [props.show]);
    if (!props.show) return null;
    const count =
      props.cartCounts?.['weapon::mock weapon'] ?? 0;
    return (
      <div data-testid="weapon-list">
        Weapons
        <span data-testid="weapon-cart-count">{count}</span>
        <button
          type="button"
          onClick={() => props.onAddToCart?.({ ...mockWeapon })}
        >
          Add to Cart
        </button>
      </div>
    );
  };
  return WeaponListMock;
});

jest.mock('../../Armor/ArmorList', () => {
  const React = require('react');
  const ArmorListMock = (props) => {
    const prevShowRef = React.useRef(false);
    React.useEffect(() => {
      if (props.show && !prevShowRef.current) {
        mockArmorListFetch();
      }
      prevShowRef.current = props.show;
    }, [props.show]);
    if (!props.show) return null;
    const count =
      props.cartCounts?.['armor::mock armor'] ?? 0;
    return (
      <div data-testid="armor-list">
        Armor
        <span data-testid="armor-cart-count">{count}</span>
        <button
          type="button"
          onClick={() => props.onAddToCart?.({ ...mockArmor })}
        >
          Add to Cart
        </button>
      </div>
    );
  };
  return ArmorListMock;
});

jest.mock('../../Items/ItemList', () => {
  const React = require('react');
  const ItemListMock = (props) => {
    const prevShowRef = React.useRef(false);
    React.useEffect(() => {
      if (props.show && !prevShowRef.current) {
        mockItemListFetch();
      }
      prevShowRef.current = props.show;
    }, [props.show]);
    if (!props.show) return null;
    const count = props.cartCounts?.['item::mock item'] ?? 0;
    return (
      <div data-testid="item-list">
        Items
        <span data-testid="item-cart-count">{count}</span>
        <button
          type="button"
          onClick={() => props.onAddToCart?.({ ...mockItem })}
        >
          Add to Cart
        </button>
      </div>
    );
  };
  return ItemListMock;
});

import ShopModal from './ShopModal';

const defaultForm = { weapon: [], armor: [], item: [], campaign: 'alpha' };
const defaultCurrency = { cp: 1, sp: 2, gp: 3, pp: 4 };

const renderShopModal = (props = {}) =>
  render(
    <ShopModal
      show
      onHide={jest.fn()}
      onTabChange={jest.fn()}
      onWeaponsChange={jest.fn()}
      onArmorChange={jest.fn()}
      onItemsChange={jest.fn()}
      form={defaultForm}
      characterId="char-1"
      strength={12}
      currency={defaultCurrency}
      {...props}
    />
  );

beforeEach(() => {
  mockWeaponListFetch.mockClear();
  mockArmorListFetch.mockClear();
  mockItemListFetch.mockClear();
});

test('cart counts increment when items are added repeatedly', async () => {
  renderShopModal();

  const weaponList = await screen.findByTestId('weapon-list');
  expect(
    within(weaponList).getByTestId('weapon-cart-count')
  ).toHaveTextContent('0');

  const weaponButton = within(weaponList).getByRole('button', {
    name: /add to cart/i,
  });

  await act(async () => {
    await userEvent.click(weaponButton);
  });
  await waitFor(() =>
    expect(
      within(weaponList).getByTestId('weapon-cart-count')
    ).toHaveTextContent('1')
  );

  await act(async () => {
    await userEvent.click(weaponButton);
  });
  await waitFor(() =>
    expect(
      within(weaponList).getByTestId('weapon-cart-count')
    ).toHaveTextContent('2')
  );

  await act(async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Armor' }));
  });

  const armorList = await screen.findByTestId('armor-list');
  expect(
    within(armorList).getByTestId('armor-cart-count')
  ).toHaveTextContent('0');

  const armorButton = within(armorList).getByRole('button', {
    name: /add to cart/i,
  });

  await act(async () => {
    await userEvent.click(armorButton);
  });
  await waitFor(() =>
    expect(
      within(armorList).getByTestId('armor-cart-count')
    ).toHaveTextContent('1')
  );

  await act(async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Items' }));
  });

  const itemList = await screen.findByTestId('item-list');
  expect(
    within(itemList).getByTestId('item-cart-count')
  ).toHaveTextContent('0');

  const itemButton = within(itemList).getByRole('button', {
    name: /add to cart/i,
  });

  await act(async () => {
    await userEvent.click(itemButton);
  });
  await waitFor(() =>
    expect(
      within(itemList).getByTestId('item-cart-count')
    ).toHaveTextContent('1')
  );
});

test('tab navigation switches between weapon, armor, and item views', async () => {
  renderShopModal();

  expect(screen.getByTestId('weapon-list')).toBeInTheDocument();
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
});

test('each list fetches once when its tab is activated', async () => {
  renderShopModal();

  await waitFor(() => expect(mockWeaponListFetch).toHaveBeenCalledTimes(1));
  expect(mockArmorListFetch).not.toHaveBeenCalled();
  expect(mockItemListFetch).not.toHaveBeenCalled();

  await act(async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Armor' }));
  });
  await waitFor(() => expect(mockArmorListFetch).toHaveBeenCalledTimes(1));
  expect(mockItemListFetch).not.toHaveBeenCalled();

  await act(async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Items' }));
  });
  await waitFor(() => expect(mockItemListFetch).toHaveBeenCalledTimes(1));
});

test('displays the provided currency summary when shown', () => {
  renderShopModal({ currency: { cp: 9, sp: 8, gp: 7, pp: 6 } });

  expect(
    screen.getByText(/PP 6 • GP 7 • SP 8 • CP 9/)
  ).toBeInTheDocument();
});

describe('cart interactions', () => {
  const scenarios = [
    {
      name: 'weapon',
      tab: null,
      listTestId: 'weapon-list',
      item: mockWeapon,
    },
    {
      name: 'armor',
      tab: 'Armor',
      listTestId: 'armor-list',
      item: mockArmor,
    },
    {
      name: 'item',
      tab: 'Items',
      listTestId: 'item-list',
      item: mockItem,
    },
  ];

  test.each(scenarios)('adds and removes a %s from the cart', async ({
    tab,
    listTestId,
    item,
  }) => {
    renderShopModal();

    const cartButton = screen.getByRole('button', { name: /view cart/i });

    if (tab) {
      await act(async () => {
        await userEvent.click(screen.getByRole('tab', { name: tab }));
      });
    }

    expect(await screen.findByTestId(listTestId)).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    });

    await waitFor(() => expect(cartButton).toHaveTextContent('1'));

    await act(async () => {
      await userEvent.click(cartButton);
    });

    const cartTitle = await screen.findByText('Cart', {
      selector: '.modal-title',
    });
    const cartModal = cartTitle.closest('.modal');
    expect(cartModal).not.toBeNull();
    const cartWithin = within(cartModal);

    expect(cartWithin.getByText(item.name)).toBeInTheDocument();
    expect(
      cartWithin.getByText(new RegExp(`Cost: ${escapeRegExp(item.cost)}`))
    ).toBeInTheDocument();
    const expectedSingleTotal = formatCoinsFromCp(
      costStringToCp(item.cost)
    );
    expect(
      cartWithin.getByText(`Total: ${expectedSingleTotal}`)
    ).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(
        cartWithin.getByRole('button', { name: 'Remove' })
      );
    });

    await waitFor(() => expect(cartButton).toHaveTextContent('0'));
    await waitFor(() =>
      expect(cartWithin.queryByText(item.name)).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(cartWithin.getByText('Your cart is empty.')).toBeInTheDocument()
    );
  });

  test('displays total cost for multiple cart items', async () => {
    renderShopModal();

    const cartButton = screen.getByRole('button', { name: /view cart/i });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    });
    await waitFor(() => expect(cartButton).toHaveTextContent('1'));

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    });
    const armorList = await screen.findByTestId('armor-list');
    await act(async () => {
      await userEvent.click(
        within(armorList).getByRole('button', { name: /add to cart/i })
      );
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: 'Items' }));
    });
    const itemList = await screen.findByTestId('item-list');
    await act(async () => {
      await userEvent.click(
        within(itemList).getByRole('button', { name: /add to cart/i })
      );
    });

    await waitFor(() => expect(cartButton).toHaveTextContent('3'));

    await act(async () => {
      await userEvent.click(cartButton);
    });

    const cartTitle = await screen.findByText('Cart', {
      selector: '.modal-title',
    });
    const cartModal = cartTitle.closest('.modal');
    expect(cartModal).not.toBeNull();
    const cartWithin = within(cartModal);

    const expectedMultiTotal = formatCoinsFromCp(
      costStringToCp(mockWeapon.cost) +
        costStringToCp(mockArmor.cost) +
        costStringToCp(mockItem.cost)
    );
    expect(expectedMultiTotal).toBe('PP 1 • GP 3 • SP 3 • CP 4');
    expect(
      cartWithin.getByText(`Total: ${expectedMultiTotal}`)
    ).toBeInTheDocument();
  });

  test('prevents purchase when funds are insufficient', async () => {
    const onPurchase = jest.fn();
    renderShopModal({
      onPurchase,
      currency: { cp: 0, sp: 0, gp: 0, pp: 0 },
    });

    const cartButton = screen.getByRole('button', { name: /view cart/i });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    });

    await act(async () => {
      await userEvent.click(cartButton);
    });

    const cartTitle = await screen.findByText('Cart', {
      selector: '.modal-title',
    });
    const cartModal = cartTitle.closest('.modal');
    expect(cartModal).not.toBeNull();
    const cartWithin = within(cartModal);

    const purchaseButton = cartWithin.getByRole('button', { name: 'Purchase' });
    expect(purchaseButton).toBeDisabled();

    await act(async () => {
      fireEvent.click(purchaseButton);
    });

    expect(onPurchase).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(
        cartWithin.getByText(/Insufficient funds to complete purchase/i)
      ).toBeInTheDocument()
    );

    expect(purchaseButton).toBeDisabled();
  });

test('purchase triggers onPurchase with cart details and resets the cart', async () => {
  const onPurchase = jest.fn();
  renderShopModal({ onPurchase });

  const cartButton = screen.getByRole('button', { name: /view cart/i });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Armor' }));
  });
  const armorList = await screen.findByTestId('armor-list');
  await act(async () => {
    await userEvent.click(
      within(armorList).getByRole('button', { name: /add to cart/i })
    );
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Items' }));
  });
  const itemList = await screen.findByTestId('item-list');
  await act(async () => {
    await userEvent.click(
      within(itemList).getByRole('button', { name: /add to cart/i })
    );
  });

  await waitFor(() => expect(cartButton).toHaveTextContent('3'));

  await act(async () => {
    await userEvent.click(cartButton);
  });

  const cartTitle = await screen.findByText('Cart', {
    selector: '.modal-title',
  });
  const cartModal = cartTitle.closest('.modal');
  expect(cartModal).not.toBeNull();
  const cartWithin = within(cartModal);

  const expectedTotalCp =
    costStringToCp(mockWeapon.cost) +
    costStringToCp(mockArmor.cost) +
    costStringToCp(mockItem.cost);
  const expectedFormattedTotal = formatCoinsFromCp(expectedTotalCp);
  expect(
    cartWithin.getByText(`Total: ${expectedFormattedTotal}`)
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(cartWithin.getByRole('button', { name: 'Purchase' }));
  });

  await waitFor(() => expect(onPurchase).toHaveBeenCalledTimes(1));
  const [cartArg, totalArg] = onPurchase.mock.calls[0];
  expect(totalArg).toBe(expectedTotalCp);
  expect(cartArg).toEqual([
    expect.objectContaining(mockWeapon),
    expect.objectContaining(mockArmor),
    expect.objectContaining(mockItem),
  ]);

  await waitFor(() => expect(cartButton).toHaveTextContent('0'));
  await waitFor(() =>
    expect(
      screen.queryByText('Cart', { selector: '.modal-title' })
    ).not.toBeInTheDocument()
  );

  await act(async () => {
    await userEvent.click(cartButton);
  });

  const emptyCartTitle = await screen.findByText('Cart', {
    selector: '.modal-title',
  });
  const emptyCartModal = emptyCartTitle.closest('.modal');
  expect(emptyCartModal).not.toBeNull();
  const emptyCartWithin = within(emptyCartModal);

  await waitFor(() =>
    expect(emptyCartWithin.getByText('Your cart is empty.')).toBeInTheDocument()
  );
});
});
