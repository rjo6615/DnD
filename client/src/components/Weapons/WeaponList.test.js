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
  apiFetch.mockResolvedValueOnce({ json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ json: async () => customData });
  const onChange = jest.fn();

  render(
    <WeaponList campaign="Camp1" initialWeapons={[weaponsData.dagger]} onChange={onChange} />
  );

  expect(apiFetch).toHaveBeenCalledWith('/weapons');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/weapons/Camp1');
  const clubCheckbox = await screen.findByLabelText(/Club/);
  const daggerCheckbox = await screen.findByLabelText(/Dagger/);
  const laserCheckbox = await screen.findByLabelText(/Laser Sword/);
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
  expect(apiFetch).toHaveBeenCalledTimes(2);
});

test('marks weapon proficiency', async () => {
  apiFetch.mockResolvedValueOnce({ json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce(
    {
      json: async () => ({
        allowed: ['club', 'dagger'],
        granted: ['dagger'],
        proficient: {},
      }),
    }
  );

  render(<WeaponList characterId="char1" />);

  const daggerRow = await screen.findByText('Dagger');
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char1');

  const daggerTr = daggerRow.closest('tr');
  const clubTr = screen.getByText('Club').closest('tr');
  expect(within(daggerTr).getByText('Yes')).toBeInTheDocument();
  expect(within(clubTr).getByText('No')).toBeInTheDocument();
});

