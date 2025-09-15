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

test('fetches weapons and handles add to cart', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: null, proficient: {}, granted: [] }),
  });
  const onAddToCart = jest.fn();

  render(
    <WeaponList
      campaign="Camp1"
      characterId="char1"
      onAddToCart={onAddToCart}
    />
  );

  expect(apiFetch).toHaveBeenCalledWith('/weapons');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/weapons/Camp1');
  expect(apiFetch).toHaveBeenCalledWith('/weapon-proficiency/char1');
  const daggerCard = await screen.findByText('Dagger');
  const daggerButton = within(daggerCard.closest('.card')).getByRole('button', {
    name: /add to cart/i,
  });

  await userEvent.click(daggerButton);

  expect(onAddToCart).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'dagger', type: 'weapon' })
  );
});

test('renders all weapons regardless of allowed list', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: ['club'], proficient: {}, granted: [] }),
  });

  render(<WeaponList campaign="Camp1" characterId="char1" />);

  expect(await screen.findByText('Club')).toBeInTheDocument();
  expect(await screen.findByText('Laser Sword')).toBeInTheDocument();
  expect(await screen.findByText('Dagger')).toBeInTheDocument();
});

test('displays a category icon for each weapon', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => weaponsData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: null, proficient: {}, granted: [] }),
  });

  render(<WeaponList campaign="Camp1" characterId="char1" />);

  const simpleIcons = await screen.findAllByTitle('simple melee');
  expect(simpleIcons.length).toBeGreaterThanOrEqual(2);
  expect(await screen.findByTitle('martial melee')).toBeInTheDocument();
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

  const daggerCard = daggerRow.closest('.card');
  const clubCard = screen.getByText('Club').closest('.card');
  const daggerProf = within(daggerCard).getByLabelText('Dagger proficiency');
  const clubProf = within(clubCard).getByLabelText('Club proficiency');
  expect(daggerProf).toBeChecked();
  expect(daggerProf).not.toBeDisabled();
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
  const daggerCard = daggerRow.closest('.card');
  const daggerProf = within(daggerCard).getByLabelText('Dagger proficiency');
  expect(daggerProf).toBeChecked();
  expect(daggerProf).toBeDisabled();
});

test('toggling a non-proficient weapon allows checking and unchecking', async () => {
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
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  render(<WeaponList characterId="char1" />);

  const clubRow = await screen.findByText('Club');
  const clubCard = clubRow.closest('.card');
  const clubProf = within(clubCard).getByLabelText('Club proficiency');

  expect(clubProf).not.toBeChecked();
  await userEvent.click(clubProf);
  await waitFor(() => expect(clubProf).toBeChecked());
  await waitFor(() => expect(clubProf).not.toBeDisabled());

  await userEvent.click(clubProf);
  await waitFor(() => expect(clubProf).not.toBeChecked());

  expect(apiFetch).toHaveBeenCalledTimes(4);
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
    within(clubRow1.closest('.card')).getByLabelText('Club proficiency')
  ).toBeChecked();
  expect(
    within(daggerRow1.closest('.card')).getByLabelText('Dagger proficiency')
  ).not.toBeChecked();

  rerender(<WeaponList characterId="char2" />);
  await waitFor(() =>
    expect(
      within(screen.getByText('Club').closest('.card')).getByLabelText(
        'Club proficiency'
      )
    ).not.toBeChecked()
  );
  await waitFor(() =>
    expect(
      within(screen.getByText('Dagger').closest('.card')).getByLabelText(
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

test('omits card wrapper when embedded', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => weaponsData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: [], proficient: {}, granted: [] }),
    });

  render(<WeaponList characterId="char1" embedded />);

  expect(await screen.findByText('Club')).toBeInTheDocument();
  expect(screen.queryByText('Weapons')).not.toBeInTheDocument();
  expect(document.querySelector('.modern-card')).toBeNull();
});

