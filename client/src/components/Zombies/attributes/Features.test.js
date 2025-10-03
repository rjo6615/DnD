import React from 'react';
import { render, screen, within, act, waitFor } from '@testing-library/react';
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

  expect(
    screen.queryByText('You can take one additional action.')
  ).not.toBeInTheDocument();

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
      darkvisionRange: 60,
      selectedAncestry: {
        label: 'Gold',
        damageType: 'Fire',
      },
    },
  };

  const onDraconicFlight = jest.fn();

  const renderFeatures = (occupation) =>
    render(
      <Features
        form={{ ...baseForm, occupation }}
        showFeatures={true}
        handleCloseFeatures={() => {}}
        onDraconicFlight={onDraconicFlight}
      />
    );

  const firstRender = renderFeatures([]);

  const darkvisionTitle = await screen.findByText('Darkvision');
  const darkvisionCard = darkvisionTitle.closest('.feature-card');
  expect(darkvisionCard).not.toBeNull();
  expect(within(darkvisionCard).getByText('Dragonborn')).toBeInTheDocument();

  const darkvisionViewButton = within(darkvisionCard).getByRole('button', {
    name: /view feature/i,
  });

  expect(
    screen.queryByText(/You can see in dim light within 60 feet of you/i)
  ).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(darkvisionViewButton);
  });

  expect(
    await screen.findByText(/You can see in dim light within 60 feet of you/i)
  ).toBeInTheDocument();

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
  const useButton = within(flightCard).getByRole('button', {
    name: /use feature/i,
  });

  expect(
    screen.queryByText(
      'When you reach character level 5, you can use a bonus action to manifest spectral wings on your back. The wings last for 1 minute or until you dismiss them as a bonus action. During this time, you gain a flying speed equal to your walking speed.'
    )
  ).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(viewButton);
  });

  expect(
    await screen.findByText(
      'When you reach character level 5, you can use a bonus action to manifest spectral wings on your back. The wings last for 1 minute or until you dismiss them as a bonus action. During this time, you gain a flying speed equal to your walking speed.'
    )
  ).toBeInTheDocument();

  expect(useButton).toBeEnabled();
  expect(onDraconicFlight).not.toHaveBeenCalled();

  await act(async () => {
    await userEvent.click(useButton);
  });

  expect(onDraconicFlight).toHaveBeenCalledTimes(1);
  expect(useButton).toBeDisabled();
});

test('dwarf characters display racial trait feature cards', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const form = {
    race: {
      name: 'Dwarf',
      darkvisionRange: 120,
    },
    occupation: [],
  };

  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
    />
  );

  const traitNames = [
    'Darkvision',
    'Dwarven Resilience',
    'Dwarven Toughness',
    'Stonecunning',
  ];

  for (const name of traitNames) {
    // eslint-disable-next-line no-await-in-loop
    expect(await screen.findByText(name)).toBeInTheDocument();
  }

  const stonecunningCard = screen.getByText('Stonecunning').closest('.feature-card');
  expect(stonecunningCard).not.toBeNull();

  const stonecunningViewButton = within(stonecunningCard).getByRole('button', {
    name: /view feature/i,
  });

  expect(
    screen.queryByText(
      /As a bonus action, you gain tremorsense with a range of 60 feet for 10 minutes\./
    )
  ).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(stonecunningViewButton);
  });

  const stonecunningDescription = await screen.findByText(
    /As a bonus action, you gain tremorsense with a range of 60 feet for 10 minutes\./
  );
  const stonecunningModal = stonecunningDescription.closest('.modal-content');
  expect(stonecunningModal).not.toBeNull();
  const stonecunningWithin = within(stonecunningModal);
  expect(
    stonecunningWithin.getByText(/Bonus action • Proficiency bonus per long rest/)
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      stonecunningWithin.getByRole('button', { name: /close/i })
    );
  });

  const darkvisionCard = screen.getByText('Darkvision').closest('.feature-card');
  expect(darkvisionCard).not.toBeNull();

  const darkvisionViewButton = within(darkvisionCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(darkvisionViewButton);
  });

  expect(
    await screen.findByText(
      /dim light within 120 feet of you as if it were bright light/i
    )
  ).toBeInTheDocument();
});

test('halfling characters display racial trait feature cards with descriptions', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const form = {
    race: {
      name: 'Halfling',
    },
    occupation: [],
  };

  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
    />
  );

  const halflingTraits = [
    {
      name: 'Brave',
      description:
        'You have advantage on saving throws you make to avoid or end the Frightened condition.',
    },
    {
      name: 'Halfling Nimbleness',
      description:
        'You can move through the space of any creature that is of a size larger than yours.',
    },
    {
      name: 'Luck',
      description:
        'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
    },
    {
      name: 'Naturally Stealthy',
      description:
        'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.',
    },
  ];

  for (const { name, description } of halflingTraits) {
    // eslint-disable-next-line no-await-in-loop
    const traitTitle = await screen.findByText(name);
    const traitCard = traitTitle.closest('.feature-card');
    expect(traitCard).not.toBeNull();

    const viewButton = within(traitCard).getByRole('button', {
      name: /view feature/i,
    });

    expect(screen.queryByText(description)).not.toBeInTheDocument();

    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await userEvent.click(viewButton);
    });

    // eslint-disable-next-line no-await-in-loop
    const descriptionText = await screen.findByText(description);
    const modal = descriptionText.closest('.modal-content');
    expect(modal).not.toBeNull();

    const closeButton = within(modal).getByRole('button', { name: /close/i });

    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await userEvent.click(closeButton);
    });
  }
});

test('forest gnome lineage shows lineage spells with ability text and tracking', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const onCastSpell = jest.fn();
  const form = {
    race: {
      name: 'Gnome',
      darkvisionRange: 60,
      gnomeLineages: {
        forest: {
          label: 'Forest Gnome',
          spellcastingAbilities: ['Intelligence', 'Wisdom'],
        },
      },
    },
    gnomeLineageKey: 'forest',
    gnomeLineage: {
      label: 'Forest Gnome',
      spellcastingAbilities: ['Intelligence', 'Wisdom'],
    },
    gnomeLineageAbility: 'Wisdom',
    occupation: [{ Name: 'Wizard', Level: 3 }],
    proficiencyBonus: 3,
  };

  const { rerender } = render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onCastSpell={onCastSpell}
      availableSlots={{ regular: { 1: 2 } }}
      longRestCount={0}
      shortRestCount={0}
    />
  );

  const darkvisionTitle = await screen.findByText('Darkvision');
  const darkvisionCard = darkvisionTitle.closest('.feature-card');
  expect(darkvisionCard).not.toBeNull();
  expect(within(darkvisionCard).getByText('Gnome')).toBeInTheDocument();

  expect(await screen.findByText('Gnomish Cunning')).toBeInTheDocument();

  const speakTitle = await screen.findByText('Speak with Animals');
  const speakCard = speakTitle.closest('.feature-card');
  expect(speakCard).not.toBeNull();
  const speakWithin = within(speakCard);
  expect(speakWithin.getByAltText('Speak with Animals')).toBeInTheDocument();
  expect(
    speakWithin.getByText('Spellcasting ability: Wisdom')
  ).toBeInTheDocument();
  expect(
    speakWithin.getByText('Uses remaining: 3')
  ).toBeInTheDocument();

  const speakViewButton = speakWithin.getByRole('button', {
    name: /view feature/i,
  });
  await act(async () => {
    await userEvent.click(speakViewButton);
  });
  const speakDescription = await screen.findByText(
    /Starting at 3rd level, you can cast Speak with Animals without expending a spell slot/i
  );
  expect(speakDescription).toHaveTextContent(
    /This lineage uses Wisdom for its spells\./i
  );
  const speakModal = speakDescription.closest('.modal-content');
  expect(speakModal).not.toBeNull();
  const speakClose = within(speakModal).getByRole('button', { name: /close/i });
  await act(async () => {
    await userEvent.click(speakClose);
  });

  const slotButton = speakWithin.getByRole('button', {
    name: /cast speak with animals using a spell slot/i,
  });
  expect(slotButton).toBeEnabled();

  await act(async () => {
    await userEvent.click(slotButton);
  });

  let dialogs = await screen.findAllByRole('dialog');
  let upcastModal = dialogs[dialogs.length - 1];
  let upcastWithin = within(upcastModal);

  const proficiencyButton = upcastWithin.getByRole('button', {
    name: /cast speak with animals using proficiency/i,
  });
  expect(proficiencyButton).toBeEnabled();
  expect(
    upcastWithin.getByText('Uses remaining: 3')
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(proficiencyButton);
  });

  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: /cast at level/i })
    ).not.toBeInTheDocument()
  );

  expect(onCastSpell).toHaveBeenNthCalledWith(1, {
    castingTime: '1 action',
    name: 'Speak with Animals',
    pendingEffectOnly: true,
  });
  expect(onCastSpell).toHaveBeenNthCalledWith(2, 'action');
  expect(
    speakWithin.getByText('Uses remaining: 2')
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(slotButton);
  });

  dialogs = await screen.findAllByRole('dialog');
  upcastModal = dialogs[dialogs.length - 1];
  upcastWithin = within(upcastModal);

  expect(
    upcastWithin.getByText('Uses remaining: 2')
  ).toBeInTheDocument();

  const levelOneSlot = upcastWithin.getByText('I');

  await act(async () => {
    await userEvent.click(levelOneSlot);
  });

  const castButtons = upcastWithin.getAllByRole('button', { name: /^cast$/i });
  const castConfirm = castButtons[castButtons.length - 1];

  await act(async () => {
    await userEvent.click(castConfirm);
  });

  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: /cast at level/i })
    ).not.toBeInTheDocument()
  );

  expect(onCastSpell).toHaveBeenLastCalledWith({
    level: 1,
    slotLevel: 1,
    slotType: 'regular',
    castingTime: '1 action',
    name: 'Speak with Animals',
  });

  expect(
    speakWithin.getByText('Uses remaining: 2')
  ).toBeInTheDocument();

  rerender(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onCastSpell={onCastSpell}
      availableSlots={{ regular: { 1: 2 } }}
      longRestCount={1}
      shortRestCount={0}
    />
  );

  expect(
    (await screen.findByText('Speak with Animals')).closest('.feature-card')
  ).not.toBeNull();
  expect(
    await screen.findByText('Uses remaining: 3')
  ).toBeInTheDocument();

  const minorIllusionTitle = await screen.findByText('Minor Illusion');
  const minorIllusionCard = minorIllusionTitle.closest('.feature-card');
  expect(minorIllusionCard).not.toBeNull();
  expect(
    within(minorIllusionCard).getByText(
      /forest gnome • spellcasting ability: wisdom/i
    )
  ).toBeInTheDocument();
  const minorViewButton = within(minorIllusionCard).getByRole('button', {
    name: /view feature/i,
  });
  await act(async () => {
    await userEvent.click(minorViewButton);
  });
  const minorDescription = await screen.findByText(
    /You know the Minor Illusion cantrip\./i
  );
  expect(minorDescription).toHaveTextContent(
    /This lineage uses Wisdom for its spells\./i
  );
  const minorModal = minorDescription.closest('.modal-content');
  expect(minorModal).not.toBeNull();
  const minorClose = within(minorModal).getByRole('button', { name: /close/i });
  await act(async () => {
    await userEvent.click(minorClose);
  });
});

test('Speak with Animals is available to forest gnomes at level 1 using proficiency', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const baseRace = {
    name: 'Gnome',
    darkvisionRange: 60,
    gnomeLineages: {
      forest: { label: 'Forest Gnome' },
    },
  };

  const onCastSpell = jest.fn();

  render(
    <Features
      form={{
        race: baseRace,
        gnomeLineageKey: 'forest',
        gnomeLineage: { label: 'Forest Gnome' },
        occupation: [{ Name: 'Wizard', Level: 1 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      availableSlots={{ regular: {}, warlock: {} }}
      onCastSpell={onCastSpell}
      longRestCount={0}
      shortRestCount={0}
    />
  );

  const speakTitle = await screen.findByText('Speak with Animals');
  const speakCard = speakTitle.closest('.feature-card');
  expect(speakCard).not.toBeNull();

  const speakWithin = within(speakCard);

  await waitFor(() =>
    expect(
      speakWithin.getByText('Uses remaining: 2')
    ).toBeInTheDocument()
  );

  const wandButton = speakWithin.getByRole('button', {
    name: /cast speak with animals using a spell slot/i,
  });
  expect(wandButton).toBeEnabled();

  await act(async () => {
    await userEvent.click(wandButton);
  });

  const dialogs = await screen.findAllByRole('dialog');
  const dialog = dialogs[dialogs.length - 1];
  expect(dialog).toBeTruthy();
  const upcastWithin = within(dialog);

  expect(
    upcastWithin.getByText('No spell slots of this level available.')
  ).toBeInTheDocument();

  const proficiencyButton = upcastWithin.getByRole('button', {
    name: /cast speak with animals using proficiency/i,
  });
  expect(proficiencyButton).toBeEnabled();

  await act(async () => {
    await userEvent.click(proficiencyButton);
  });

  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: /cast at level/i })
    ).not.toBeInTheDocument()
  );

  expect(onCastSpell).toHaveBeenNthCalledWith(1, {
    castingTime: '1 action',
    name: 'Speak with Animals',
    pendingEffectOnly: true,
  });
  expect(onCastSpell).toHaveBeenNthCalledWith(2, 'action');
  expect(
    speakWithin.getByText('Uses remaining: 1')
  ).toBeInTheDocument();
});

test('Speak with Animals wand button respects available uses and slots', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const baseRace = {
    name: 'Gnome',
    darkvisionRange: 60,
    gnomeLineages: {
      forest: { label: 'Forest Gnome' },
    },
  };

  const baseForm = {
    race: baseRace,
    gnomeLineageKey: 'forest',
    gnomeLineage: { label: 'Forest Gnome' },
    occupation: [{ Name: 'Wizard', Level: 3 }],
  };

  const { rerender } = render(
    <Features
      form={{ ...baseForm, proficiencyBonus: 2 }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      availableSlots={{ regular: { 1: 0 }, warlock: {} }}
    />
  );

  const getSpeakCard = () => {
    const speakTitle = screen.getByText('Speak with Animals');
    const speakCard = speakTitle.closest('.feature-card');
    expect(speakCard).not.toBeNull();
    return speakCard;
  };

  const getWandButton = () =>
    within(getSpeakCard()).getByRole('button', {
      name: /cast speak with animals using a spell slot/i,
    });

  const waitForUses = async (value) => {
    await waitFor(() =>
      expect(
        within(getSpeakCard()).getByText(`Uses remaining: ${value}`)
      ).toBeInTheDocument()
    );
  };

  await screen.findByText('Speak with Animals');
  await waitForUses(2);
  await waitFor(() => expect(getWandButton()).toBeEnabled());

  rerender(
    <Features
      form={{ ...baseForm, proficiencyBonus: 0.5 }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      availableSlots={{ regular: { 1: 1 }, warlock: {} }}
    />
  );

  await waitForUses(0);
  await waitFor(() => expect(getWandButton()).toBeEnabled());

  rerender(
    <Features
      form={{ ...baseForm, proficiencyBonus: 0.5 }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      availableSlots={{ regular: { 1: 0 }, warlock: {} }}
    />
  );

  await waitForUses(0);
  await waitFor(() => expect(getWandButton()).toBeDisabled());
});

test('orc characters display racial traits and track Adrenaline Rush uses with rests', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const form = {
    race: { name: 'Orc' },
    proficiencyBonus: 3,
    occupation: [],
  };

  const { rerender } = render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      shortRestCount={0}
      longRestCount={0}
    />
  );

  expect(await screen.findByText('Adrenaline Rush')).toBeInTheDocument();
  expect(await screen.findByText('Darkvision')).toBeInTheDocument();
  expect(await screen.findByText('Relentless Endurance')).toBeInTheDocument();

  const adrenalineCard = screen
    .getByText('Adrenaline Rush')
    .closest('.feature-card');
  expect(adrenalineCard).not.toBeNull();

  const adrenalineWithin = within(adrenalineCard);
  const useButton = adrenalineWithin.getByRole('button', {
    name: /use feature/i,
  });
  expect(useButton).toBeEnabled();
  expect(
    adrenalineWithin.getByText('Uses remaining: 3')
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(useButton);
  });
  expect(
    adrenalineWithin.getByText('Uses remaining: 2')
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(useButton);
  });
  expect(
    adrenalineWithin.getByText('Uses remaining: 1')
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(useButton);
  });
  expect(useButton).toBeDisabled();
  expect(
    adrenalineWithin.getByText('Uses remaining: 0')
  ).toBeInTheDocument();

  rerender(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      shortRestCount={1}
      longRestCount={0}
    />
  );

  const refreshedCard = await screen.findByText('Adrenaline Rush');
  const refreshedWithin = within(refreshedCard.closest('.feature-card'));
  const refreshedUseButton = refreshedWithin.getByRole('button', {
    name: /use feature/i,
  });
  expect(refreshedUseButton).toBeEnabled();
  expect(
    refreshedWithin.getByText('Uses remaining: 3')
  ).toBeInTheDocument();
});

test('rock gnome lineage surfaces cantrips and clockwork device guidance', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const rockLineage = {
    label: 'Rock Gnome',
    spellcastingAbilities: ['Intelligence'],
  };

  const form = {
    race: {
      name: 'Gnome',
      gnomeLineages: { rock: rockLineage },
    },
    gnomeLineage: rockLineage,
    gnomeLineageKey: 'rock',
    occupation: [],
  };

  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
    />
  );

  const mendingTitle = await screen.findByText('Mending');
  const mendingCard = mendingTitle.closest('.feature-card');
  expect(mendingCard).not.toBeNull();
  const mendingWithin = within(mendingCard);
  expect(
    mendingWithin.getByText('Rock Gnome • Spellcasting Ability: Intelligence')
  ).toBeInTheDocument();
  expect(
    mendingWithin.getByRole('button', { name: /view feature/i })
  ).toBeInTheDocument();
  expect(
    mendingWithin.queryByRole('button', { name: /use feature/i })
  ).not.toBeInTheDocument();

  const prestidigitationTitle = await screen.findByText('Prestidigitation');
  const prestidigitationCard = prestidigitationTitle.closest('.feature-card');
  expect(prestidigitationCard).not.toBeNull();
  const prestidigitationWithin = within(prestidigitationCard);
  expect(
    prestidigitationWithin.getByText(
      'Rock Gnome • Spellcasting Ability: Intelligence'
    )
  ).toBeInTheDocument();

  const prestidigitationView = prestidigitationWithin.getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(prestidigitationView);
  });

  expect(
    await screen.findByText(
      /spend 10 minutes to create a Tiny clockwork device \(AC 5, 1 hp\)/i
    )
  ).toBeInTheDocument();
});

test('goliath ancestry features include boon, Powerful Build, and Large Form at level 5', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const ancestry = {
    label: "Cloud's Jaunt",
    ancestryName: 'Cloud Giant',
    description: 'As a bonus action, teleport up to 30 feet to an unoccupied space you can see.',
    usage: 'Bonus action • Proficiency bonus per long rest',
  };

  const race = {
    name: 'Goliath',
    giantAncestries: { cloud: ancestry },
    selectedAncestryKey: 'cloud',
    selectedAncestry: ancestry,
  };

  const onLargeForm = jest.fn();

  const { rerender } = render(
    <Features
      form={{ race, occupation: [{ Name: 'Barbarian', Level: 4 }] }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onLargeForm={onLargeForm}
    />
  );

  const boon = await screen.findByText("Cloud's Jaunt");
  expect(boon).toBeInTheDocument();
  expect(screen.getByText('Powerful Build')).toBeInTheDocument();

  const boonCard = boon.closest('.feature-card');
  expect(boonCard).not.toBeNull();
  const boonViewButton = within(boonCard).getByRole('button', {
    name: /view feature/i,
  });

  expect(
    screen.queryByText(
      "As a bonus action, teleport up to 30 feet to an unoccupied space you can see. Bonus action • Proficiency bonus per long rest"
    )
  ).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(boonViewButton);
  });

  expect(
    await screen.findByText(
      "As a bonus action, teleport up to 30 feet to an unoccupied space you can see. Bonus action • Proficiency bonus per long rest"
    )
  ).toBeInTheDocument();

  const boonModals = screen.getAllByRole('dialog');
  const boonModal = boonModals[boonModals.length - 1];
  const boonClose = within(boonModal).getByRole('button', { name: /close/i });

  await act(async () => {
    await userEvent.click(boonClose);
  });

  expect(screen.queryByText('Large Form')).not.toBeInTheDocument();

  rerender(
    <Features
      form={{ race, occupation: [{ Name: 'Barbarian', Level: 5 }] }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onLargeForm={onLargeForm}
    />
  );

  const largeForm = await screen.findByText('Large Form');
  expect(largeForm).toBeInTheDocument();

  const largeFormCard = largeForm.closest('.feature-card');
  expect(largeFormCard).not.toBeNull();
  const largeFormView = within(largeFormCard).getByRole('button', {
    name: /view feature/i,
  });

  const largeFormUse = within(largeFormCard).getByRole('button', {
    name: /use feature/i,
  });

  expect(largeFormUse).toBeEnabled();
  expect(onLargeForm).not.toHaveBeenCalled();

  expect(
    screen.queryByText(
      "Starting at 5th level, you can use a bonus action to magically grow to Large size for 10 minutes. While Large, your speed increases by 10 feet, and you have advantage on Strength checks. Once you use this trait, you can't use it again until you finish a long rest."
    )
  ).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(largeFormView);
  });

  expect(
    await screen.findByText(
      "Starting at 5th level, you can use a bonus action to magically grow to Large size for 10 minutes. While Large, your speed increases by 10 feet, and you have advantage on Strength checks. Once you use this trait, you can't use it again until you finish a long rest."
    )
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(largeFormUse);
  });

  expect(onLargeForm).toHaveBeenCalledTimes(1);
  expect(largeFormUse).toBeDisabled();
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
