import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeaponList from './WeaponList';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

const weaponsData = {
  club: { name: 'Club', damage: '1d4 bludgeoning', category: 'simple melee', properties: ['light'], weight: 2, cost: '1 sp', proficient: false },
  dagger: { name: 'Dagger', damage: '1d4 piercing', category: 'simple melee', properties: ['finesse'], weight: 1, cost: '2 gp', proficient: true },
};

test('fetches and toggles weapon proficiency', async () => {
  apiFetch.mockResolvedValueOnce({ json: async () => weaponsData });

  render(<WeaponList characterId="123" />);

  expect(apiFetch).toHaveBeenCalledWith('/weapons');
  const clubCheckbox = await screen.findByLabelText(/Club/);
  const daggerCheckbox = await screen.findByLabelText(/Dagger/);
  expect(clubCheckbox).not.toBeChecked();
  expect(daggerCheckbox).toBeChecked();

  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ weapon: 'club', proficient: true }) });
  await userEvent.click(clubCheckbox);
  await waitFor(() =>
    expect(apiFetch).toHaveBeenLastCalledWith(
      '/weapon-proficiency/123',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ weapon: 'club', proficient: true }),
      })
    )
  );
  await waitFor(() => expect(clubCheckbox).toBeChecked());
});

test('disables checkbox when server rejects toggle', async () => {
  apiFetch.mockResolvedValueOnce({ json: async () => weaponsData });

  render(<WeaponList characterId="123" />);
  const daggerCheckbox = await screen.findByLabelText(/Dagger/);

  apiFetch.mockResolvedValueOnce({ ok: false });
  await userEvent.click(daggerCheckbox);
  await waitFor(() => expect(daggerCheckbox).toBeDisabled());
});

