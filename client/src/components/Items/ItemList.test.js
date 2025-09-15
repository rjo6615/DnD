import { render, screen, within } from '@testing-library/react';
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

test('fetches items and handles add to cart', async () => {
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

  render(
    <ItemList
      campaign="Camp1"
      characterId="char1"
      onAddToCart={onAddToCart}
    />
  );

  expect(apiFetch).toHaveBeenCalledWith('/items');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/items/Camp1');
  const potionHeading = await screen.findByText('Potion of healing');
  const addButton = within(potionHeading.closest('.card')).getByRole('button', {
    name: /add to cart/i,
  });

  await userEvent.click(addButton);

  expect(onAddToCart).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'potion-healing',
      displayName: 'Potion of healing',
      type: 'item',
      cost: '50 gp',
      category: 'adventuring gear',
      weight: 0.5,
    })
  );
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
