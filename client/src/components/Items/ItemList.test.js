import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemList from './ItemList';
import apiFetch from '../../utils/apiFetch';
import { items as srdItems } from '../../../../server/data/items';

jest.mock('../../utils/apiFetch');

const itemsData = {
  torch: srdItems.torch,
  'potion-healing': srdItems['potion-healing'],
};
const customData = [
  { name: 'Jetpack', category: 'adventuring gear', weight: 20, cost: '500 gp' },
];

afterEach(() => {
  apiFetch.mockReset();
});

test('fetches items, handles add to cart, and displays cart count', async () => {
  apiFetch.mockImplementation((url) => {
    if (url === '/items') {
      return Promise.resolve({ ok: true, json: async () => itemsData });
    }
    if (url === '/equipment/items/Camp1') {
      return Promise.resolve({ ok: true, json: async () => customData });
    }
    return Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
  });
  const onAddToCart = jest.fn();

  function Wrapper(props) {
    const [counts, setCounts] = React.useState({});
    const handleAdd = (item) => {
      act(() => {
        setCounts((prev) => {
          const key = `item::${String(item?.name || '').toLowerCase()}`;
          return { ...prev, [key]: (prev[key] || 0) + 1 };
        });
      });
      onAddToCart(item);
    };
    return (
      <ItemList
        {...props}
        onAddToCart={handleAdd}
        cartCounts={counts}
      />
    );
  }

  render(
    <Wrapper
      campaign="Camp1"
      characterId="char1"
    />
  );

  expect(apiFetch).toHaveBeenCalledWith('/items');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/items/Camp1');
  const potionHeading = await screen.findByText('Potion of healing');
  const addButton = within(potionHeading.closest('.card')).getByRole('button', {
    name: /add to cart/i,
  });
  expect(
    within(potionHeading.closest('.card')).getByText('In Cart: 0')
  ).toBeInTheDocument();

  await userEvent.click(addButton);
  await waitFor(() =>
    expect(
      within(potionHeading.closest('.card')).getByText('In Cart: 1')
    ).toBeInTheDocument()
  );

  await userEvent.click(addButton);
  await waitFor(() =>
    expect(
      within(potionHeading.closest('.card')).getByText('In Cart: 2')
    ).toBeInTheDocument()
  );

  expect(onAddToCart).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'potion-healing',
      displayName: 'Potion of healing',
      type: 'item',
      cost: '50 gp',
      category: 'consumable',
      weight: 0.5,
    })
  );
  expect(onAddToCart).toHaveBeenCalledTimes(2);
});

test('shows error message when item fetch fails', async () => {
  apiFetch.mockImplementation((url) => {
    if (url === '/items') {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });
    }
    if (url === '/equipment/items/Camp1') {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    return Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
  });

  render(<ItemList campaign="Camp1" />);

  expect(
    await screen.findByText('Failed to load items: 500 Server Error')
  ).toBeInTheDocument();
});

test('omits card header and footer when embedded', async () => {
  apiFetch.mockImplementation((url) => {
    if (url === '/items') {
      return Promise.resolve({ ok: true, json: async () => itemsData });
    }
    if (url === '/equipment/items/Camp1') {
      return Promise.resolve({ ok: true, json: async () => customData });
    }
    return Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
  });

  const onClose = jest.fn();

  render(<ItemList campaign="Camp1" embedded onClose={onClose} />);

  expect(await screen.findByText('Potion of healing')).toBeInTheDocument();
  expect(screen.queryByText('Items')).not.toBeInTheDocument();
  expect(document.querySelector('.modern-card')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
});

test('shows quantity badge when multiple copies are owned', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => itemsData });

  render(
    <ItemList
      characterId="char1"
      ownedOnly
      embedded
      initialItems={[
        { name: 'Torch', owned: true },
        { name: 'Torch', owned: true },
        { name: 'Potion of healing', owned: true },
      ]}
    />
  );

  const torchHeading = await screen.findByText('Torch');
  const torchCard = torchHeading.closest('.card');
  expect(torchCard).not.toBeNull();
  expect(screen.getAllByText('Torch')).toHaveLength(1);
  expect(within(torchCard).getByText('×2')).toBeInTheDocument();
  expect(screen.getAllByText('Potion of healing')).toHaveLength(1);
});

test('use button removes a consumable item copy and triggers onChange', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => itemsData });
  const onChange = jest.fn();
  const initialItems = [
    {
      name: 'potion-healing',
      displayName: 'Potion of healing',
      properties: ['consumable'],
      owned: true,
    },
    {
      name: 'potion-healing',
      displayName: 'Potion of healing',
      properties: ['consumable'],
      owned: true,
    },
  ];

  render(
    <ItemList
      ownedOnly
      embedded
      initialItems={initialItems}
      onChange={onChange}
    />
  );

  const potionHeading = await screen.findByText('Potion of healing');
  const potionCard = potionHeading.closest('.card');
  expect(potionCard).not.toBeNull();
  expect(within(potionCard).getByText('×2')).toBeInTheDocument();

  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

  const useButton = within(potionCard).getByRole('button', {
    name: /use/i,
  });
  await userEvent.click(useButton);

  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  const updatedItems = onChange.mock.calls[0][0];
  expect(Array.isArray(updatedItems)).toBe(true);
  expect(updatedItems).toHaveLength(1);

  await waitFor(() =>
    expect(within(potionCard).queryByText('×2')).not.toBeInTheDocument()
  );
  expect(screen.getAllByText('Potion of healing')).toHaveLength(1);

  await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
  const [event] = dispatchSpy.mock.calls.pop() || [];
  expect(event).toBeInstanceOf(CustomEvent);
  expect(event?.detail?.source).toMatch(/potion of healing/i);
  expect(typeof event?.detail?.value).toBe('number');
  expect(event.detail.value).toBeGreaterThanOrEqual(4);
  expect(event.detail.value).toBeLessThanOrEqual(10);
  if (typeof event.detail.breakdown === 'string') {
    expect(typeof event.detail.breakdown).toBe('string');
  } else {
    expect(event.detail.breakdown).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        expression: expect.any(String),
        entries: expect.arrayContaining([expect.any(String)]),
      })
    );
  }

  dispatchSpy.mockRestore();
});
