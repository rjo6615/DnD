import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Features from './Features';

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
    '.feature-card'
  );
  expect(actionSurgeCard).not.toBeNull();

  const actionSurgeButton = within(actionSurgeCard).getByRole('button', {
    name: /view feature/i
  });

  await act(async () => {
    await userEvent.click(actionSurgeButton);
  });

  expect(
    await screen.findByText('You can take one additional action.')
  ).toBeInTheDocument();
});

test('dragonborn always has damage resistance and gains draconic flight at level 5', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const baseForm = {
    race: {
      name: 'Dragonborn',
      selectedAncestry: {
        label: 'Gold',
        damageType: 'Fire',
      },
    },
  };

  const renderFeatures = (occupation) =>
    render(
      <Features
        form={{ ...baseForm, occupation }}
        showFeatures={true}
        handleCloseFeatures={() => {}}
      />
    );

  const firstRender = renderFeatures([]);

  expect(await screen.findByText('Damage Resistance')).toBeInTheDocument();
  expect(screen.queryByText('Draconic Flight')).not.toBeInTheDocument();

  firstRender.unmount();

  const levelFiveForm = [{ Name: 'Fighter', Level: 5 }];

  renderFeatures(levelFiveForm);

  const flightFeature = await screen.findByText('Draconic Flight');
  expect(await screen.findByText('Damage Resistance')).toBeInTheDocument();
  expect(screen.getAllByText('Damage Resistance').length).toBeGreaterThan(0);

  const flightCard = flightFeature.closest('.feature-card');
  expect(flightCard).not.toBeNull();

  const viewButton = within(flightCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(viewButton);
  });

  const descriptions = await screen.findAllByText(
    'When you reach character level 5, you can use a bonus action to manifest spectral wings on your back. The wings last for 1 minute or until you dismiss them as a bonus action. During this time, you gain a flying speed equal to your walking speed.'
  );
  expect(descriptions.length).toBeGreaterThan(0);
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

  const featureNameNodes = screen.getAllByText((_, node) =>
    node.classList?.contains('feature-card-name')
  );

  const order = featureNameNodes.map((node) => node.textContent);
  expect(order).toEqual(['Second Wind', 'Action Surge', 'Arcane Recovery']);
});
