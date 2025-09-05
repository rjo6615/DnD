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
  { name: 'Laser Sword', damage: '1d8 radiant', category: 'martial melee', properties: [] },
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
        expect.objectContaining({ name: 'club' }),
        expect.objectContaining({ name: 'dagger' }),
      ])
    )
  );
  expect(apiFetch).toHaveBeenCalledTimes(3);
});

test('renders all weapons regardless of allowed list', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: ['club'], proficient: {}, granted: [] }),
  });

  render(<WeaponList campaign="Camp1" characterId="char1" />);

  expect(await screen.findByLabelText('Club')).toBeInTheDocument();
  expect(await screen.findByLabelText('Laser Sword')).toBeInTheDocument();
  expect(await screen.findByLabelText('Dagger')).toBeInTheDocument();
});

test('marks weapon proficiency', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce(
    {
      ok: true,
      json: async () => ({
        allowed: ['club', 'dagger'],
        proficient: { dagger: true },
        granted: [],
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

test('granted proficiencies render checked and disabled', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      allowed: ['club', 'dagger'],
      proficient: {},
      granted: ['dagger'],
    }),
  });

  render(<WeaponList characterId="char1" />);

  const daggerRow = await screen.findByText('Dagger');
  const daggerTr = daggerRow.closest('tr');
  const daggerProf = within(daggerTr).getByLabelText('Dagger proficiency');
  expect(daggerProf).toBeChecked();
  expect(daggerProf).toBeDisabled();
});

test('toggling a non-proficient weapon checks and disables it', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => weaponsData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        allowed: ['club', 'dagger'],
        proficient: {},
        granted: [],
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  render(<WeaponList characterId="char1" />);

  const clubRow = await screen.findByText('Club');
  const clubTr = clubRow.closest('tr');
  const clubProf = within(clubTr).getByLabelText('Club proficiency');

  expect(clubProf).not.toBeChecked();
  await userEvent.click(clubProf);
  await waitFor(() => expect(clubProf).toBeChecked());
  await waitFor(() => expect(clubProf).toBeDisabled());

  await userEvent.click(clubProf);
  expect(clubProf).toBeChecked();
  expect(apiFetch).toHaveBeenCalledTimes(3);
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

test('reloads proficiency data when character changes', async () => {
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

  const clubRow1 = await screen.findByText('Club');
  const daggerRow1 = await screen.findByText('Dagger');
  expect(
    within(clubRow1.closest('tr')).getByLabelText('Club proficiency')
  ).toBeChecked();
  expect(
    within(daggerRow1.closest('tr')).getByLabelText('Dagger proficiency')
  ).not.toBeChecked();

  rerender(<WeaponList characterId="char2" />);
  await waitFor(() =>
    expect(
      within(screen.getByText('Club').closest('tr')).getByLabelText(
        'Club proficiency'
      )
    ).not.toBeChecked()
  );
  await waitFor(() =>
    expect(
      within(screen.getByText('Dagger').closest('tr')).getByLabelText(
        'Dagger proficiency'
      )
    ).toBeChecked()
  );
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char2');
});

test('refetches weapons when modal is opened', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => weaponsData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: [], proficient: {}, granted: [] }),
    });

  const { rerender } = render(<WeaponList characterId="char1" show={false} />);

  expect(apiFetch).not.toHaveBeenCalled();

  rerender(<WeaponList characterId="char1" show />);
  expect(await screen.findByText('Dagger')).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/weapons');
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char1');
});

test('warns when unknown weapon names are returned', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => weaponsData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        allowed: ['club', 'mystery'],
        proficient: {},
        granted: [],
      }),
    });

  render(<WeaponList characterId="char1" />);

  expect(await screen.findByText('Club')).toBeInTheDocument();
  expect(screen.queryByText('mystery')).not.toBeInTheDocument();
  const alert = await screen.findByText(/Unrecognized weapons from server:/);
  expect(alert).toHaveTextContent('mystery');
  expect(warn).toHaveBeenCalledWith(
    'Unrecognized weapon from server:',
    'mystery'
  );
  warn.mockRestore();
});

