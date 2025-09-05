import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeaponList from './WeaponList';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

const weaponsData = {
  club: { name: 'Club', damage: '1d4 bludgeoning', category: 'simple melee', properties: ['light'], weight: 2, cost: '1 sp' },
  dagger: { name: 'Dagger', damage: '1d4 piercing', category: 'simple melee', properties: ['finesse'], weight: 1, cost: '2 gp' },
};
const customData = [
  { weaponName: 'Laser Sword', damage: '1d8 radiant', weaponStyle: 'martial melee' },
];

afterEach(() => {
  apiFetch.mockReset();
});

test('fetches weapons and toggles ownership', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: null, proficient: {}, granted: [] }),
  });
  const onChange = jest.fn();

  render(
    <WeaponList
      campaign="Camp1"
      initialWeapons={[weaponsData.dagger]}
      onChange={onChange}
      characterId="char1"
    />
  );

  expect(apiFetch).toHaveBeenCalledWith('/weapons');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/weapons/Camp1');
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char1');
  const clubCheckbox = await screen.findByLabelText('Club');
  const daggerCheckbox = await screen.findByLabelText('Dagger');
  const laserCheckbox = await screen.findByLabelText('Laser Sword');
  expect(clubCheckbox).not.toBeChecked();
  expect(daggerCheckbox).toBeChecked();
  expect(laserCheckbox).not.toBeChecked();

  onChange.mockClear();
  await userEvent.click(clubCheckbox);
  await waitFor(() => expect(clubCheckbox).toBeChecked());
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Club' }),
        expect.objectContaining({ name: 'Dagger' }),
      ])
    )
  );
  expect(apiFetch).toHaveBeenCalledTimes(3);
});

test('marks weapon proficiency', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce(
    {
      ok: true,
      json: async () => ({
        allowed: ['club', 'dagger'],
        proficient: { dagger: true },
        granted: ['dagger'],
      }),
    }
  );

  render(<WeaponList characterId="char1" />);

  const daggerRow = await screen.findByText('Dagger');
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char1');

  const daggerTr = daggerRow.closest('tr');
  const clubTr = screen.getByText('Club').closest('tr');
  const daggerProf = within(daggerTr).getByLabelText('Dagger proficiency');
  const clubProf = within(clubTr).getByLabelText('Club proficiency');
  expect(daggerProf).toBeChecked();
  expect(daggerProf).toBeDisabled();
  expect(clubProf).not.toBeChecked();
});

test('shows all weapons when allowed list is empty', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: [], proficient: {}, granted: [] }),
  });

  render(<WeaponList characterId="char1" />);

  expect(await screen.findByText('Club')).toBeInTheDocument();
  expect(await screen.findByText('Dagger')).toBeInTheDocument();
});

test('reloads allowed and proficient weapons when character changes', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => weaponsData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: ['club'], proficient: { club: true }, granted: [] }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => weaponsData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: ['dagger'], proficient: { dagger: true }, granted: [] }),
    });

  const { rerender } = render(<WeaponList characterId="char1" />);

  expect(await screen.findByText('Club')).toBeInTheDocument();
  expect(screen.queryByText('Dagger')).not.toBeInTheDocument();

  rerender(<WeaponList characterId="char2" />);
  expect(await screen.findByText('Dagger')).toBeInTheDocument();
  expect(screen.queryByText('Club')).not.toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char2');
});

