import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeaponList from './WeaponList';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

const weaponsData = {
  club: { name: 'Club', damage: '1d4 bludgeoning', category: 'simple melee', properties: ['light'], weight: 2, cost: '1 sp', proficient: false },
  dagger: { name: 'Dagger', damage: '1d4 piercing', category: 'simple melee', properties: ['finesse'], weight: 1, cost: '2 gp', proficient: true },
};
const customData = [
  { weaponName: 'Laser Sword', damage: '1d8 radiant', weaponStyle: 'martial melee' },
];

afterEach(() => {
  apiFetch.mockReset();
});

test('fetches and toggles weapon proficiency', async () => {
  apiFetch.mockResolvedValueOnce({ json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ json: async () => customData });
  const onChange = jest.fn();

  render(<WeaponList characterId="123" campaign="Camp1" onChange={onChange} />);

  expect(apiFetch).toHaveBeenCalledWith('/weapons');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/weapons/Camp1');
  const clubCheckbox = await screen.findByLabelText(/Club/);
  const daggerCheckbox = await screen.findByLabelText(/Dagger/);
  const laserCheckbox = await screen.findByLabelText(/Laser Sword/);
  expect(clubCheckbox).not.toBeChecked();
  expect(daggerCheckbox).toBeChecked();
  expect(laserCheckbox).not.toBeChecked();

  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Dagger', proficient: true }),
    ])
  );
  onChange.mockClear();

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
  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Club', proficient: true }),
        expect.objectContaining({ name: 'Dagger', proficient: true }),
      ])
    )
  );
});

test('reverts checkbox when server rejects toggle', async () => {
  apiFetch.mockResolvedValueOnce({ json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ json: async () => customData });

  render(<WeaponList characterId="123" campaign="Camp1" />);
  const daggerCheckbox = await screen.findByLabelText(/Dagger/);

  apiFetch.mockResolvedValueOnce({ ok: false });
  await userEvent.click(daggerCheckbox);

  await waitFor(() => {
    expect(daggerCheckbox).toBeChecked();
    expect(daggerCheckbox).not.toBeDisabled();
  });
});

