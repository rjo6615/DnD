import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Features from './Features';
import { WEAPON_MASTERY_OPTION_MAP } from './weaponMasteryOptions';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

beforeEach(() => {
  apiFetch.mockReset();
});

test('renders features and opens modal with description', async () => {
  apiFetch.mockImplementation((url) => {
    const levelMatch = url.match(/features\/(\d+)/);
    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    let features = [];
    if (level === 1) {
      features = [
        { name: 'Second Wind', description: 'Regain hit points.' }
      ];
    } else if (level === 2) {
      features = [
        {
          name: 'Action Surge',
          description: 'You can take one additional action.'
        }
      ];
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ features })
    });
  });

  const form = { occupation: [{ Name: 'Fighter', Level: 2 }] };
  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
    />
  );

  expect(await screen.findByText('Second Wind')).toBeInTheDocument();
  expect(await screen.findByText('Action Surge')).toBeInTheDocument();

  const useButtons = await screen.findAllByRole('button', {
    name: /use feature/i
  });
  expect(useButtons).toHaveLength(2);

  const actionSurgeCard = (await screen.findByText('Action Surge')).closest(
    '[data-testid="feature-card"]'
  );
  const actionSurgeButton = within(actionSurgeCard).getByRole('button', {
    name: /view feature/i
  });

  await act(async () => {
    await userEvent.click(actionSurgeButton);
  });

  const modals = await screen.findAllByRole('dialog');
  const actionSurgeModal = modals.find((element) =>
    within(element).queryByText('Action Surge')
  );
  expect(actionSurgeModal).toBeTruthy();
  expect(
    within(actionSurgeModal).getByText('You can take one additional action.')
  ).toBeInTheDocument();
});

test('features are sorted by class then level', async () => {
  apiFetch.mockImplementation((url) => {
    const match = url.match(/classes\/(.*?)\/features\/(\d+)/);
    const className = match ? match[1] : '';
    const level = match ? parseInt(match[2]) : 0;
    let features = [];
    if (className === 'wizard' && level === 1) {
      features = [{ name: 'Arcane Recovery' }];
    } else if (className === 'fighter') {
      if (level === 1)
        features = [{ name: 'Second Wind' }];
      else if (level === 2)
        features = [{ name: 'Action Surge' }];
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ features }),
    });
  });

  const form = {
    occupation: [
      { Name: 'Wizard', Level: 1 },
      { Name: 'Fighter', Level: 2 },
    ],
  };
  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
    />
  );

  expect(await screen.findByText('Arcane Recovery')).toBeInTheDocument();

  const cards = screen.getAllByTestId('feature-card');
  const order = cards.map((card) => {
    const name = card.querySelector('.feature-card-name').textContent;
    const [cls, lvl] = card.querySelectorAll('.feature-card-meta span');
    return {
      cls: cls.textContent,
      lvl: lvl.textContent,
      feat: name,
    };
  });
  expect(order).toEqual([
    { cls: 'Fighter', lvl: 'Level 1', feat: 'Second Wind' },
    { cls: 'Fighter', lvl: 'Level 2', feat: 'Action Surge' },
    { cls: 'Wizard', lvl: 'Level 1', feat: 'Arcane Recovery' },
  ]);
});

test('weapon mastery card supports selections and modal details', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      features: [
        {
          name: 'Weapon Mastery',
          description: 'Choose your weapon mastery benefits.',
          mastery: { picks: 2 },
        },
      ],
    }),
  });

  const featureKey = 'fighter::1::weapon mastery';
  const onFeatureStateChange = jest.fn();

  render(
    <Features
      form={{
        occupation: [
          {
            Name: 'Fighter',
            Level: 1,
            weapons: ['simple', 'martial'],
          },
        ],
        weapon: [
          ['Longsword', 'martial melee', '1d8 slashing', [], '', '', 'longsword'],
          ['Shortsword', 'martial melee', '1d6 piercing', [], '', '', 'shortsword'],
        ],
        equipment: {
          mainHand: { name: 'Longsword', type: 'longsword', source: 'weapon' },
        },
        features: {
          weaponMastery: {
            [featureKey]: ['longsword', 'shortsword'],
          },
        },
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onFeatureStateChange={onFeatureStateChange}
    />
  );

  const masteryCard = await screen.findByTestId('feature-card');
  expect(within(masteryCard).getByText('Weapon Mastery')).toBeInTheDocument();

  const selects = within(masteryCard).getAllByRole('combobox');
  expect(selects).toHaveLength(2);
  expect(selects[0]).toHaveDisplayValue('Longsword');
  expect(selects[1]).toHaveDisplayValue('Shortsword');

  const handaxeOption = within(selects[1]).getByRole('option', {
    name: 'Handaxe',
  });

  await act(async () => {
    await userEvent.selectOptions(selects[1], handaxeOption);
  });

  expect(onFeatureStateChange).toHaveBeenCalled();
  const updateFn = onFeatureStateChange.mock.calls.at(-1)[0];
  const updatedState = updateFn({ weaponMastery: {} });
  expect(updatedState.weaponMastery[featureKey]).toEqual([
    'longsword',
    'handaxe',
  ]);
  expect(updatedState.weaponMastery[featureKey]).not.toContain('vex');

  const selectionsHeader = within(masteryCard).getByText('Current selections');
  const selectionsSection = selectionsHeader.parentElement;
  expect(selectionsSection).toBeTruthy();
  const selectionsList = within(selectionsSection).getByRole('list');
  const currentListItems = within(selectionsList).getAllByRole('listitem');
  expect(currentListItems[0]).toHaveTextContent('Longsword — Flex');
  expect(currentListItems[0]).toHaveTextContent(
    WEAPON_MASTERY_OPTION_MAP.flex.description
  );
  expect(currentListItems[1]).toHaveTextContent('Handaxe — Vex');
  expect(currentListItems[1]).toHaveTextContent(
    WEAPON_MASTERY_OPTION_MAP.vex.description
  );

  await act(async () => {
    await userEvent.click(
      within(masteryCard).getByRole('button', { name: /view feature/i })
    );
  });

  const modals = await screen.findAllByRole('dialog');
  const modal = modals.find((element) =>
    within(element).queryByText('Weapon Mastery Selections')
  );
  expect(modal).toBeTruthy();
  expect(
    within(modal).getByText('Weapon Mastery Selections')
  ).toBeInTheDocument();
  const modalListItems = within(modal).getAllByRole('listitem');
  expect(modalListItems[0]).toHaveTextContent('Longsword');
  expect(modalListItems[0]).toHaveTextContent('Flex');
  expect(modalListItems[0]).toHaveTextContent(
    WEAPON_MASTERY_OPTION_MAP.flex.description
  );
  expect(modalListItems[1]).toHaveTextContent('Handaxe');
  expect(modalListItems[1]).toHaveTextContent('Vex');
  expect(modalListItems[1]).toHaveTextContent(
    WEAPON_MASTERY_OPTION_MAP.vex.description
  );
});
