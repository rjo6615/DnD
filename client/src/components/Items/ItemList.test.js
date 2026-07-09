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

  await act(async () => {
    render(
      <ItemList
        ownedOnly
        embedded
        initialItems={initialItems}
        onChange={onChange}
      />
    );
  });

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
  const events = dispatchSpy.mock.calls.map(([evt]) => evt);

  const healingEvent = events.find((evt) => evt?.type === 'damage-roll');
  expect(healingEvent).toBeInstanceOf(CustomEvent);
  expect(healingEvent?.detail?.source).toMatch(/potion of healing/i);
  expect(typeof healingEvent?.detail?.value).toBe('number');
  expect(healingEvent.detail.value).toBeGreaterThanOrEqual(4);
  expect(healingEvent.detail.value).toBeLessThanOrEqual(10);
  expect(typeof healingEvent.detail.breakdown).toBe('string');

  const consumableEvent = events.find(
    (evt) => evt?.type === 'inventory:consumable-used'
  );
  expect(consumableEvent).toBeInstanceOf(CustomEvent);
  expect(consumableEvent?.detail?.type).toBe('potion');
  expect(consumableEvent?.detail?.item?.displayName).toMatch(/potion/i);

  dispatchSpy.mockRestore();
});

test('using all copies of a consumable potion removes it from the inventory', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => itemsData });
  const onChange = jest.fn();
  const initialItems = Array.from({ length: 3 }, () => ({
    name: 'potion-healing',
    displayName: 'Potion of healing',
    properties: ['consumable'],
    owned: true,
  }));

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
  expect(within(potionCard).getByText('×3')).toBeInTheDocument();

  const useButton = within(potionCard).getByRole('button', { name: /use/i });

  await userEvent.click(useButton);
  await userEvent.click(useButton);
  await userEvent.click(useButton);

  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(3));
  const finalItems = onChange.mock.calls[2][0];
  expect(finalItems).toHaveLength(0);

  await waitFor(() =>
    expect(screen.queryByText('Potion of healing')).not.toBeInTheDocument()
  );
});

test('inventory entries with slug and display names stack together', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => itemsData });

  render(
    <ItemList
      ownedOnly
      embedded
      initialItems={[
        'potion-healing',
        { name: 'Potion of healing', properties: ['consumable'], owned: true },
        {
          name: 'potion of healing',
          displayName: 'Potion of Healing',
          properties: ['consumable'],
          owned: true,
        },
      ]}
    />
  );

  const potionHeading = await screen.findByText('Potion of healing');
  const potionCard = potionHeading.closest('.card');
  expect(potionCard).not.toBeNull();
  expect(within(potionCard).getByText('×3')).toBeInTheDocument();
});

test('delete button removes an item after confirmation', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => itemsData });
  const onChange = jest.fn();
  const initialItems = [
    { name: 'Torch', displayName: 'Torch', owned: true },
    { name: 'Torch', displayName: 'Torch', owned: true },
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

  const torchHeading = await screen.findByText('Torch');
  const torchCard = torchHeading.closest('.card');
  expect(torchCard).not.toBeNull();

  const deleteButton = within(torchCard).getByRole('button', { name: /delete torch/i });
  await act(async () => {
    await userEvent.click(deleteButton);
  });

  const confirmationMessage = await screen.findByText(
    /are you sure you want to remove torch from your inventory/i
  );
  const confirmationModal = confirmationMessage.closest('.modal');
  expect(confirmationModal).not.toBeNull();

  const confirmButton = within(confirmationModal).getByRole('button', { name: /delete/i });
  await act(async () => {
    await userEvent.click(confirmButton);
  });

  await act(async () => {});

  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  const updatedItems = onChange.mock.calls[0][0];
  expect(updatedItems).toHaveLength(2);

  const torchCount = updatedItems.filter((entry) => {
    if (!entry) return false;
    if (typeof entry === 'string') return entry.toLowerCase() === 'torch';
    if (Array.isArray(entry)) {
      return String(entry[0] || '').toLowerCase() === 'torch';
    }
    const name = String(entry.name || entry.displayName || '').toLowerCase();
    return name === 'torch';
  }).length;
  expect(torchCount).toBe(1);

  await waitFor(() =>
    expect(screen.queryByText(/are you sure you want to remove torch/i)).not.toBeInTheDocument()
  );
  await waitFor(() =>
    expect(within(torchCard).queryByText(/×2/)).not.toBeInTheDocument()
  );
});
