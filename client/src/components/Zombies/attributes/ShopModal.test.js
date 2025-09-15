import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockWeaponListFetch = jest.fn();
const mockArmorListFetch = jest.fn();
const mockItemListFetch = jest.fn();

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
    return props.show ? <div data-testid="weapon-list">Weapons</div> : null;
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
    return props.show ? <div data-testid="armor-list">Armor</div> : null;
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
    return props.show ? <div data-testid="item-list">Items</div> : null;
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
