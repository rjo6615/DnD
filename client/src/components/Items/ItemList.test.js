import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemList from './ItemList';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

const itemsData = {
  rope: { name: 'Rope', category: 'gear', weight: 10, cost: '1 gp' },
  torch: { name: 'Torch', category: 'gear', weight: 1, cost: '1 cp' },
};
const customData = [
  { name: 'Jetpack', category: 'gear', weight: 20, cost: '500 gp' },
];

afterEach(() => {
  apiFetch.mockReset();
});

test('fetches items and toggles ownership', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => itemsData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  const onChange = jest.fn();

  render(
    <ItemList
      campaign="Camp1"
      initialItems={[itemsData.torch]}
      onChange={onChange}
      characterId="char1"
    />
  );

  expect(apiFetch).toHaveBeenCalledWith('/items');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/items/Camp1');
  const ropeCheckbox = await screen.findByLabelText('Rope');
  const torchCheckbox = await screen.findByLabelText('Torch');
  const jetCheckbox = await screen.findByLabelText('Jetpack');
  expect(torchCheckbox).toBeChecked();
  expect(ropeCheckbox).not.toBeChecked();
  expect(jetCheckbox).not.toBeChecked();

  onChange.mockClear();
  await userEvent.click(ropeCheckbox);
  await waitFor(() => expect(ropeCheckbox).toBeChecked());
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'rope' }),
        expect.objectContaining({ name: 'torch' }),
      ])
    )
  );
  expect(apiFetch).toHaveBeenCalledTimes(2);
});

test('shows error message when item fetch fails', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    .mockResolvedValueOnce({ ok: true, json: async () => [] });

  render(<ItemList campaign="Camp1" />);

  expect(
    await screen.findByText('Failed to load items: 500 Server Error')
  ).toBeInTheDocument();
});
