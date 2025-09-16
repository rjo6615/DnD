import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArmorList from './ArmorList';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

const armorData = {
  leather: {
    name: 'Leather Armor',
    category: 'light',
    acBonus: 1,
    maxDex: null,
    strength: null,
    stealth: false,
    weight: 10,
    cost: '10 gp',
  },
  'chain mail': {
    name: 'Chain Mail',
    category: 'heavy',
    acBonus: 6,
    maxDex: 0,
    strength: 13,
    stealth: true,
    weight: 55,
    cost: '75 gp',
  },
};
const customData = [
  {
    name: 'Force Shield',
    category: 'special',
    acBonus: 8,
    maxDex: null,
    strength: null,
    stealth: false,
    weight: 5,
    cost: '1000 gp',
    type: 'shield',
  },
];

afterEach(() => {
  apiFetch.mockReset();
});

test('fetches armor and handles add to cart', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: null, proficient: {}, granted: [] }),
  });
  const onAddToCart = jest.fn();

  render(
    <ArmorList
      campaign="Camp1"
      characterId="char1"
      strength={15}
      onAddToCart={onAddToCart}
    />
  );

  expect(apiFetch).toHaveBeenCalledWith('/armor');
  expect(apiFetch).toHaveBeenCalledWith('/equipment/armor/Camp1');
  expect(apiFetch).toHaveBeenCalledWith('/armor-proficiency/char1');
  const forceShieldHeading = await screen.findByText('Force Shield');
  const forceShieldButton = within(
    forceShieldHeading.closest('.card')
  ).getByRole(
    'button',
    {
      name: /add to cart/i,
    }
  );

  await userEvent.click(forceShieldButton);

  expect(onAddToCart).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'force shield',
      displayName: 'Force Shield',
      type: 'armor',
      armorType: 'shield',
      cost: '1000 gp',
      acBonus: 8,
      category: 'special',
    })
  );
});

test('renders add to cart when strength requirement unmet', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: null, proficient: {}, granted: [] }),
  });

  const onAddToCart = jest.fn();

  render(<ArmorList characterId="char1" strength={10} onAddToCart={onAddToCart} />);

  const chainMailHeading = await screen.findByText('Chain Mail');
  const button = within(chainMailHeading.closest('.card')).getByRole('button', {
    name: /add to cart/i,
  });
  expect(button).not.toBeDisabled();
  await userEvent.click(button);
  expect(onAddToCart).toHaveBeenCalled();
});

test('renders all armor regardless of allowed list', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => customData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: ['leather'], proficient: {}, granted: [] }),
  });

  render(<ArmorList campaign="Camp1" characterId="char1" strength={15} />);

  expect(await screen.findByText('Leather Armor')).toBeInTheDocument();
  expect(await screen.findByText('Force Shield')).toBeInTheDocument();
  expect(await screen.findByText('Chain Mail')).toBeInTheDocument();
});

test('marks armor proficiency', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });
  apiFetch.mockResolvedValueOnce(
    {
      ok: true,
      json: async () => ({
        allowed: ['leather', 'chain mail'],
        proficient: { 'chain mail': true },
        granted: [],
      }),
    }
  );

  render(<ArmorList characterId="char1" strength={15} />);

  const chainRow = await screen.findByText('Chain Mail');
  expect(apiFetch).toHaveBeenCalledWith('/armor-proficiency/char1');

  const chainCard = chainRow.closest('.card');
  const leatherCard = screen.getByText('Leather Armor').closest('.card');
  const chainProf = within(chainCard).getByLabelText('Chain Mail proficiency');
  const leatherProf = within(leatherCard).getByLabelText('Leather Armor proficiency');
  expect(chainProf).toBeChecked();
  expect(chainProf).not.toBeDisabled();
  expect(leatherProf).not.toBeChecked();
});

test('granted proficiencies render checked and disabled', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      allowed: ['leather', 'chain mail'],
      proficient: {},
      granted: ['chain mail'],
    }),
  });

  render(<ArmorList characterId="char1" strength={15} />);

  const chainRow = await screen.findByText('Chain Mail');
  const chainCard = chainRow.closest('.card');
  const chainProf = within(chainCard).getByLabelText('Chain Mail proficiency');
  expect(chainProf).toBeChecked();
  expect(chainProf).toBeDisabled();
});

test('toggling a non-proficient armor allows checking and unchecking', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        allowed: ['leather', 'chain mail'],
        proficient: {},
        granted: [],
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  render(<ArmorList characterId="char1" strength={15} />);

  const leatherRow = await screen.findByText('Leather Armor');
  const leatherCard = leatherRow.closest('.card');
  const leatherProf = within(leatherCard).getByLabelText('Leather Armor proficiency');

  expect(leatherProf).not.toBeChecked();
  await userEvent.click(leatherProf);
  await waitFor(() => expect(leatherProf).toBeChecked());
  await waitFor(() => expect(leatherProf).not.toBeDisabled());

  await userEvent.click(leatherProf);
  await waitFor(() => expect(leatherProf).not.toBeChecked());

  expect(apiFetch).toHaveBeenCalledTimes(4);
});

test('renders duplicate armor entries when multiple copies are owned', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: null, proficient: {}, granted: [] }),
    });

  render(
    <ArmorList
      characterId="char1"
      strength={15}
      ownedOnly
      embedded
      initialArmor={[
        { name: 'Leather Armor', owned: true },
        { name: 'Leather Armor', owned: true },
        { name: 'Chain Mail', owned: true },
      ]}
    />
  );

  const leatherEntries = await screen.findAllByText('Leather Armor');
  expect(leatherEntries).toHaveLength(2);
  expect(screen.getByText('Copy 1 of 2')).toBeInTheDocument();
  expect(screen.getByText('Copy 2 of 2')).toBeInTheDocument();
  expect(screen.getAllByText('Chain Mail')).toHaveLength(1);
});

test('shows all armor when allowed list is empty', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ allowed: [], proficient: {}, granted: [] }),
  });

  render(<ArmorList characterId="char1" strength={15} />);

  expect(await screen.findByText('Leather Armor')).toBeInTheDocument();
  expect(await screen.findByText('Chain Mail')).toBeInTheDocument();
});

test('reloads proficiency data when character changes', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: ['leather'], proficient: { leather: true }, granted: [] }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: ['chain mail'], proficient: { 'chain mail': true }, granted: [] }),
    });

  const { rerender } = render(<ArmorList characterId="char1" strength={15} />);

  const leatherRow1 = await screen.findByText('Leather Armor');
  const chainRow1 = await screen.findByText('Chain Mail');
  expect(
    within(leatherRow1.closest('.card')).getByLabelText('Leather Armor proficiency')
  ).toBeChecked();
  expect(
    within(chainRow1.closest('.card')).getByLabelText('Chain Mail proficiency')
  ).not.toBeChecked();

  rerender(<ArmorList characterId="char2" strength={15} />);
  await waitFor(() =>
    expect(
      within(screen.getByText('Leather Armor').closest('.card')).getByLabelText(
        'Leather Armor proficiency'
      )
    ).not.toBeChecked()
  );
  await waitFor(() =>
    expect(
      within(screen.getByText('Chain Mail').closest('.card')).getByLabelText(
        'Chain Mail proficiency'
      )
    ).toBeChecked()
  );
  expect(apiFetch).toHaveBeenCalledWith('/armor-proficiency/char2');
});

test('refetches armor when modal is opened', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: [], proficient: {}, granted: [] }),
    });

  const { rerender } = render(<ArmorList characterId="char1" show={false} strength={15} />);

  expect(apiFetch).not.toHaveBeenCalled();

  rerender(<ArmorList characterId="char1" show strength={15} />);
  expect(await screen.findByText('Chain Mail')).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/armor');
  expect(apiFetch).toHaveBeenCalledWith('/armor-proficiency/char1');
});

test('shows error message when armor fetch fails', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: null, proficient: {}, granted: [] }),
    });

  render(<ArmorList characterId="char1" strength={15} />);

  expect(
    await screen.findByText('Failed to load armor: 500 Server Error')
  ).toBeInTheDocument();
});

test('warns when unknown armor names are returned', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        allowed: ['leather', 'mystery'],
        proficient: {},
        granted: [],
      }),
    });

  render(<ArmorList characterId="char1" strength={15} />);

  expect(await screen.findByText('Leather Armor')).toBeInTheDocument();
  expect(screen.queryByText('mystery')).not.toBeInTheDocument();
  const alert = await screen.findByText(/Unrecognized armor from server:/);
  expect(alert).toHaveTextContent('mystery');
  expect(warn).toHaveBeenCalledWith(
    'Unrecognized armor from server:',
    'mystery'
  );
  warn.mockRestore();
});

test('skips invalid initial armor entries with warning', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => armorData });

  render(
    <ArmorList
      initialArmor={[armorData['chain mail'], { invalid: true }, 42, null]}
      strength={15}
    />
  );

  expect(await screen.findByText('Chain Mail')).toBeInTheDocument();
  expect(warn).toHaveBeenCalledWith('Skipping invalid initial armor entries:', [
    { invalid: true },
    42,
    null,
  ]);
  warn.mockRestore();
});

test('omits card wrapper when embedded', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => armorData })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowed: [], proficient: {}, granted: [] }),
    });

  render(<ArmorList characterId="char1" strength={15} embedded />);

  expect(await screen.findByText('Leather Armor')).toBeInTheDocument();
  expect(screen.queryByText('Armor')).not.toBeInTheDocument();
  expect(document.querySelector('.modern-card')).toBeNull();
});

