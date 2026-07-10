import React from 'react';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Features from './Features';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

const TEST_CHARACTER_ID = 'test-character-id';

beforeEach(() => {
  apiFetch.mockReset();
  window.localStorage.clear();
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
      characterId={TEST_CHARACTER_ID}
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
        characterId={TEST_CHARACTER_ID}
      />
    );

  const firstRender = renderFeatures([]);

  const darkvisionTitle = await screen.findByText('Darkvision');
  const darkvisionCard = darkvisionTitle.closest('.feature-card');
  expect(darkvisionCard).not.toBeNull();
  expect(
    within(darkvisionCard).getByText('Dragonborn 60 ft')
  ).toBeInTheDocument();

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
      characterId={TEST_CHARACTER_ID}
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

test('elven lineage cantrips use wand casting without consuming uses', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const onCastSpell = jest.fn();

  const form = {
    race: {
      name: 'Elf',
      elvenLineages: {
        drow: {
          label: 'Drow',
          spellcastingAbilities: ['CHA'],
        },
      },
      selectedAncestry: {
        label: 'Drow',
        spellcastingAbilities: ['CHA'],
      },
      selectedAncestryKey: 'drow',
      selectedLineageAbility: 'CHA',
    },
    elvenLineage: {
      label: 'Drow',
      spellcastingAbilities: ['CHA'],
    },
    elvenLineageKey: 'drow',
    elvenLineageAbility: 'CHA',
    occupation: [{ Name: 'Wizard', Level: 1 }],
  };

  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onCastSpell={onCastSpell}
      characterId={TEST_CHARACTER_ID}
    />
  );

  const dancingLightsTitle = await screen.findByText('Dancing Lights');
  const card = dancingLightsTitle.closest('.feature-card');
  expect(card).not.toBeNull();

  const wandButton = within(card).getByRole('button', {
    name: /cast dancing lights from lineage/i,
  });

  expect(wandButton).toBeEnabled();
  expect(within(card).queryByText(/Uses remaining:/i)).toBeNull();

  await act(async () => {
    await userEvent.click(wandButton);
  });

  expect(onCastSpell).toHaveBeenCalledTimes(2);
  expect(onCastSpell).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      name: 'Dancing Lights',
      castingTime: '1 action',
      pendingEffectOnly: true,
    })
  );
  expect(onCastSpell).toHaveBeenNthCalledWith(2, 'action');
  expect(wandButton).toBeEnabled();
  expect(within(card).queryByText(/Uses remaining:/i)).toBeNull();
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
      characterId={TEST_CHARACTER_ID}
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

test('elf characters display baseline traits and drow lineage magic', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const form = {
    race: {
      name: 'Elf',
      speed: 30,
      darkvisionRange: 120,
      elvenLineages: {
        drow: {
          label: 'Drow',
          spellcastingAbilities: ['Charisma'],
          darkvisionRange: 120,
        },
      },
      selectedAncestryKey: 'drow',
      selectedAncestry: {
        label: 'Drow',
        spellcastingAbilities: ['Charisma'],
        darkvisionRange: 120,
      },
      selectedLineageAbility: 'Charisma',
    },
    elvenLineageKey: 'drow',
    elvenLineage: {
      label: 'Drow',
      spellcastingAbilities: ['Charisma'],
      darkvisionRange: 120,
    },
    elvenLineageAbility: 'Charisma',
    occupation: [],
  };

  const { rerender } = render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Fey Ancestry')).toBeInTheDocument();
  expect(screen.getByText('Trance')).toBeInTheDocument();
  expect(screen.getByText('Keen Senses')).toBeInTheDocument();

  const dancingLightsTitle = await screen.findByText('Dancing Lights');
  const dancingCard = dancingLightsTitle.closest('.feature-card');
  expect(dancingCard).not.toBeNull();
  expect(
    within(dancingCard).getByText(/Spellcasting Ability: Charisma/i)
  ).toBeInTheDocument();

  expect(screen.queryByText('Faerie Fire (Level 3)')).not.toBeInTheDocument();
  expect(screen.queryByText('Darkness (Level 5)')).not.toBeInTheDocument();

  rerender(
    <Features
      form={{
        ...form,
        occupation: [{ Name: 'Wizard', Level: 3 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Faerie Fire (Level 3)')).toBeInTheDocument();
  expect(screen.queryByText('Darkness (Level 5)')).not.toBeInTheDocument();

  const faerieFireCard = screen.getByText('Faerie Fire (Level 3)').closest(
    '.feature-card'
  );
  expect(faerieFireCard).not.toBeNull();
  const faerieFireViewButton = within(faerieFireCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(faerieFireViewButton);
  });

  const faerieDescription = await screen.findByText(
    /Starting at 3rd level, you can cast Faerie Fire with this trait once per long rest\./i
  );
  expect(faerieDescription).toHaveTextContent(
    /This lineage uses Charisma for its spells\./i
  );
  expect(faerieDescription).not.toHaveTextContent(/future update/i);

  const faerieModal = faerieDescription.closest('.modal-content');
  expect(faerieModal).not.toBeNull();
  const faerieClose = within(faerieModal).getByRole('button', { name: /close/i });

  await act(async () => {
    await userEvent.click(faerieClose);
  });

  rerender(
    <Features
      form={{
        ...form,
        occupation: [{ Name: 'Wizard', Level: 5 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Darkness (Level 5)')).toBeInTheDocument();

  const darknessCard = screen.getByText('Darkness (Level 5)').closest(
    '.feature-card'
  );
  expect(darknessCard).not.toBeNull();
  const darknessViewButton = within(darknessCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(darknessViewButton);
  });

  const darknessDescription = await screen.findByText(
    /Starting at 5th level, you can cast Darkness with this trait once per long rest\./i
  );
  expect(darknessDescription).toHaveTextContent(
    /This lineage uses Charisma for its spells\./i
  );
  expect(darknessDescription).not.toHaveTextContent(/future update/i);

  const darknessModal = darknessDescription.closest('.modal-content');
  expect(darknessModal).not.toBeNull();
  const darknessClose = within(darknessModal).getByRole('button', {
    name: /close/i,
  });

  await act(async () => {
    await userEvent.click(darknessClose);
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
    await screen.findByText(/dim light within 120 feet of you/i)
  ).toBeInTheDocument();
});

test('wood elf lineage notes speed increase and lineage spells', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const form = {
    race: {
      name: 'Elf',
      speed: 35,
      darkvisionRange: 60,
      elvenLineages: {
        wood: {
          label: 'Wood Elf',
          spellcastingAbilities: ['Wisdom'],
          speed: 35,
        },
      },
      selectedAncestryKey: 'wood',
      selectedAncestry: {
        label: 'Wood Elf',
        spellcastingAbilities: ['Wisdom'],
        speed: 35,
      },
      selectedLineageAbility: 'Wisdom',
    },
    elvenLineageKey: 'wood',
    elvenLineage: {
      label: 'Wood Elf',
      spellcastingAbilities: ['Wisdom'],
      speed: 35,
    },
    elvenLineageAbility: 'Wisdom',
    occupation: [],
  };

  const { rerender } = render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  const druidcraftTitle = await screen.findByText('Druidcraft');
  const druidcraftCard = druidcraftTitle.closest('.feature-card');
  expect(druidcraftCard).not.toBeNull();
  const viewButton = within(druidcraftCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(viewButton);
  });

  expect(
    await screen.findByText(/Your walking speed increases to 35 feet/i)
  ).toBeInTheDocument();
  expect(screen.queryByText('Longstrider (Level 3)')).not.toBeInTheDocument();
  expect(screen.queryByText('Pass without Trace (Level 5)')).not.toBeInTheDocument();

  rerender(
    <Features
      form={{
        ...form,
        occupation: [{ Name: 'Ranger', Level: 3 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Longstrider (Level 3)')).toBeInTheDocument();
  expect(screen.queryByText('Pass without Trace (Level 5)')).not.toBeInTheDocument();

  const longstriderCard = screen.getByText('Longstrider (Level 3)').closest(
    '.feature-card'
  );
  expect(longstriderCard).not.toBeNull();
  const longstriderViewButton = within(longstriderCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(longstriderViewButton);
  });

  const longstriderDescription = await screen.findByText(
    /Starting at 3rd level, you can cast Longstrider with this trait once per long rest\./i
  );
  expect(longstriderDescription).toHaveTextContent(
    /This lineage uses Wisdom for its spells\./i
  );
  expect(longstriderDescription).not.toHaveTextContent(/future update/i);

  const longstriderModal = longstriderDescription.closest('.modal-content');
  expect(longstriderModal).not.toBeNull();
  const longstriderClose = within(longstriderModal).getByRole('button', {
    name: /close/i,
  });

  await act(async () => {
    await userEvent.click(longstriderClose);
  });

  rerender(
    <Features
      form={{
        ...form,
        occupation: [{ Name: 'Ranger', Level: 5 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Pass without Trace (Level 5)')).toBeInTheDocument();
});

test('high elf lineage lists arcane cantrip and future spell hooks', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const form = {
    race: {
      name: 'Elf',
      speed: 30,
      darkvisionRange: 60,
      elvenLineages: {
        high: {
          label: 'High Elf',
          spellcastingAbilities: ['Intelligence'],
        },
      },
      selectedAncestryKey: 'high',
      selectedAncestry: {
        label: 'High Elf',
        spellcastingAbilities: ['Intelligence'],
      },
      selectedLineageAbility: 'Intelligence',
    },
    elvenLineageKey: 'high',
    elvenLineage: {
      label: 'High Elf',
      spellcastingAbilities: ['Intelligence'],
    },
    elvenLineageAbility: 'Intelligence',
    occupation: [],
  };

  const { rerender } = render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  const prestidigitationTitle = await screen.findByText('Prestidigitation');
  const prestidigitationCard = prestidigitationTitle.closest('.feature-card');
  expect(prestidigitationCard).not.toBeNull();
  expect(
    within(prestidigitationCard).getByText(/Spellcasting Ability: Intelligence/i)
  ).toBeInTheDocument();
  expect(screen.queryByText('Detect Magic (Level 3)')).not.toBeInTheDocument();
  expect(screen.queryByText('Misty Step (Level 5)')).not.toBeInTheDocument();

  rerender(
    <Features
      form={{
        ...form,
        occupation: [{ Name: 'Wizard', Level: 3 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Detect Magic (Level 3)')).toBeInTheDocument();
  expect(screen.queryByText('Misty Step (Level 5)')).not.toBeInTheDocument();

  rerender(
    <Features
      form={{
        ...form,
        occupation: [{ Name: 'Wizard', Level: 5 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Misty Step (Level 5)')).toBeInTheDocument();

  const detectMagicCard = screen.getByText('Detect Magic (Level 3)').closest(
    '.feature-card'
  );
  expect(detectMagicCard).not.toBeNull();
  const detectMagicViewButton = within(detectMagicCard).getByRole('button', {
    name: /view feature/i,
  });

  await act(async () => {
    await userEvent.click(detectMagicViewButton);
  });

  const detectMagicDescription = await screen.findByText(
    /Starting at 3rd level, you can cast Detect Magic with this trait once per long rest\./i
  );
  expect(detectMagicDescription).toHaveTextContent(
    /This lineage uses Intelligence for its spells\./i
  );
  expect(detectMagicDescription).not.toHaveTextContent(/future update/i);

  const detectMagicModal = detectMagicDescription.closest('.modal-content');
  expect(detectMagicModal).not.toBeNull();
  const detectMagicClose = within(detectMagicModal).getByRole('button', {
    name: /close/i,
  });

  await act(async () => {
    await userEvent.click(detectMagicClose);
  });
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
      characterId={TEST_CHARACTER_ID}
    />
  );

  const darkvisionTitle = await screen.findByText('Darkvision');
  const darkvisionCard = darkvisionTitle.closest('.feature-card');
  expect(darkvisionCard).not.toBeNull();
  expect(within(darkvisionCard).getByText('Gnome 60 ft')).toBeInTheDocument();

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
      characterId={TEST_CHARACTER_ID}
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

test('Speak with Animals uses restore from local storage when available', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  window.localStorage.setItem(
    `zombiesSpeakWithAnimalsUses:${TEST_CHARACTER_ID}`,
    '1'
  );

  const form = {
    race: {
      name: 'Gnome',
      darkvisionRange: 60,
      gnomeLineages: {
        forest: { label: 'Forest Gnome', spellcastingAbilities: ['Wisdom'] },
      },
    },
    gnomeLineageKey: 'forest',
    gnomeLineage: { label: 'Forest Gnome' },
    gnomeLineageAbility: 'Wisdom',
    occupation: [{ Name: 'Wizard', Level: 3 }],
    proficiencyBonus: 3,
  };

  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onCastSpell={jest.fn()}
      availableSlots={{ regular: { 1: 2 } }}
      longRestCount={0}
      shortRestCount={0}
      characterId={TEST_CHARACTER_ID}
    />
  );

  const speakTitle = await screen.findByText('Speak with Animals');
  const speakCard = speakTitle.closest('.feature-card');
  expect(speakCard).not.toBeNull();
  expect(
    within(speakCard).getByText('Uses remaining: 1')
  ).toBeInTheDocument();
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
    />
  );

  await waitForUses(0);
  await waitFor(() => expect(getWandButton()).toBeDisabled());
});

test('tiefling fiendish legacy shows resistance and spells with ability details', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const infernalLegacy = {
    label: 'Infernal Legacy',
    resistance: 'Fire',
    spellcastingAbilities: ['Intelligence', 'Wisdom', 'Charisma'],
    spells: [
      {
        name: 'Fire Bolt',
        spellLevel: 'Cantrip',
        unlockedAtLevel: 1,
        description:
          'Launch a mote of fire at a creature within range, dealing fire damage on a hit.',
        usage: 'At will',
      },
      {
        name: 'Hellish Rebuke',
        spellLevel: '1st-level',
        unlockedAtLevel: 3,
        description:
          'Surround an attacker in searing flame as a reaction, forcing a Dexterity save or dealing fire damage.',
        usage: '1/long rest',
      },
      {
        name: 'Darkness',
        spellLevel: '2nd-level',
        unlockedAtLevel: 5,
        description:
          'Create a 15-foot-radius sphere of magical darkness that spreads around corners.',
        usage: '1/long rest',
      },
    ],
  };

  render(
    <Features
      form={{
        race: {
          name: 'Tiefling',
          darkvisionRange: 60,
          fiendishLegacies: { infernal: infernalLegacy },
        },
        tieflingLegacyKey: 'infernal',
        tieflingLegacy: infernalLegacy,
        tieflingLegacyAbility: 'Charisma',
        occupation: [{ Name: 'Wizard', Level: 5 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      longRestCount={0}
      shortRestCount={0}
      availableSlots={{ regular: { 3: 1 } }}
      characterId={TEST_CHARACTER_ID}
    />
  );

  const resistanceTitle = await screen.findByText('Fire Resistance');
  const resistanceCard = resistanceTitle.closest('.feature-card');
  expect(resistanceCard).not.toBeNull();
  if (!resistanceCard) {
    throw new Error('Expected Fire Resistance card');
  }
  const resistanceWithin = within(resistanceCard);
  expect(resistanceWithin.getByText(/Resistance: Fire/i)).toBeInTheDocument();
  expect(resistanceWithin.getByText(/Spellcasting Ability: Charisma/i)).toBeInTheDocument();

  const otherworldlyTitle = screen.getByText('Otherworldly Presence (Thaumaturgy)');
  const otherworldlyCard = otherworldlyTitle.closest('.feature-card');
  expect(otherworldlyCard).not.toBeNull();
  if (!otherworldlyCard) {
    throw new Error('Expected Otherworldly Presence card');
  }
  const otherworldlyWithin = within(otherworldlyCard);
  expect(
    otherworldlyWithin.getByText(/Spellcasting Ability: Charisma/i)
  ).toBeInTheDocument();
  const otherworldlyView = otherworldlyWithin.getByRole('button', {
    name: /view feature/i,
  });
  await act(async () => {
    await userEvent.click(otherworldlyView);
  });
  const thaumaturgyModalText = await screen.findByText(
    /You know the Thaumaturgy cantrip/i
  );
  expect(thaumaturgyModalText).toBeInTheDocument();
  const thaumaturgyModal = thaumaturgyModalText.closest('.modal-content');
  if (!thaumaturgyModal) {
    throw new Error('Expected Thaumaturgy modal content');
  }
  const thaumaturgyClose = within(thaumaturgyModal).getByRole('button', {
    name: /close/i,
  });
  await act(async () => {
    await userEvent.click(thaumaturgyClose);
  });

  const fireBoltCard = screen.getByText('Fire Bolt').closest('.feature-card');
  expect(fireBoltCard).not.toBeNull();
  if (!fireBoltCard) {
    throw new Error('Expected Fire Bolt card');
  }
  const fireBoltWithin = within(fireBoltCard);
  expect(fireBoltWithin.getByText(/Infernal Legacy/i)).toBeInTheDocument();
  expect(
    fireBoltWithin.getByText(/Spellcasting Ability: Charisma/i)
  ).toBeInTheDocument();
  expect(
    fireBoltWithin.queryByText(/Resistance:\s*Fire/i)
  ).not.toBeInTheDocument();

  const hellishCard = screen
    .getByText('Hellish Rebuke (Level 3)')
    .closest('.feature-card');
  expect(hellishCard).not.toBeNull();
  if (!hellishCard) {
    throw new Error('Expected Hellish Rebuke card');
  }
  const hellishWithin = within(hellishCard);
  expect(hellishWithin.getByText(/Infernal Legacy/i)).toBeInTheDocument();
  expect(hellishWithin.getByText(/Uses remaining/i)).toBeInTheDocument();
  expect(
    hellishWithin.queryByText(/Resistance:\s*Fire/i)
  ).not.toBeInTheDocument();
  const viewHellish = hellishWithin.getByRole('button', { name: /view feature/i });
  await act(async () => {
    await userEvent.click(viewHellish);
  });
  expect(
    await screen.findByText(/This legacy uses Charisma for its spells\./i)
  ).toBeInTheDocument();
  expect(screen.getByText(/Uses: 1\/long rest/i)).toBeInTheDocument();
  const hellishModal = screen.getByText(/Uses: 1\/long rest/i).closest('.modal-content');
  if (!hellishModal) {
    throw new Error('Expected Hellish Rebuke modal');
  }
  const closeButton = within(hellishModal).getByRole('button', { name: /close/i });
  await act(async () => {
    await userEvent.click(closeButton);
  });

  expect(screen.getByText('Darkness (Level 5)')).toBeInTheDocument();
});

test('tiefling legacy spell uses upcast modal with C button and tracks usage', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const infernalLegacy = {
    label: 'Infernal Legacy',
    resistance: 'Fire',
    spellcastingAbilities: ['Charisma'],
    spells: [
      {
        name: 'Fire Bolt',
        spellLevel: 'Cantrip',
        unlockedAtLevel: 1,
        description: 'Hurl a mote of fire.',
        usage: 'At will',
      },
      {
        name: 'Hellish Rebuke',
        spellLevel: '1st-level',
        unlockedAtLevel: 3,
        description: 'Wreathe an attacker in flames.',
        usage: '1/long rest',
      },
      {
        name: 'Darkness',
        spellLevel: '2nd-level',
        unlockedAtLevel: 5,
        description: 'Magical darkness spreads from a point you choose.',
        usage: '1/long rest',
      },
    ],
  };

  const onCastSpell = jest.fn();

  render(
    <Features
      form={{
        race: {
          name: 'Tiefling',
          darkvisionRange: 60,
          fiendishLegacies: { infernal: infernalLegacy },
        },
        tieflingLegacyKey: 'infernal',
        tieflingLegacy: infernalLegacy,
        tieflingLegacyAbility: 'Charisma',
        occupation: [{ Name: 'Warlock', Level: 5 }],
      }}
      showFeatures={true}
      handleCloseFeatures={() => {}}
      onCastSpell={onCastSpell}
      longRestCount={0}
      shortRestCount={0}
      availableSlots={{ regular: { 1: 1, 3: 1 } }}
      characterId={TEST_CHARACTER_ID}
    />
  );

  const hellishCard = await screen.findByText('Hellish Rebuke (Level 3)');
  const hellishFeature = hellishCard.closest('.feature-card');
  expect(hellishFeature).not.toBeNull();
  if (!hellishFeature) {
    throw new Error('Expected Hellish Rebuke feature card');
  }
  expect(
    within(hellishFeature).getByRole('button', {
      name: /cast hellish rebuke from lineage/i,
    })
  ).toBeInTheDocument();
  expect(
    within(hellishFeature).getByRole('button', {
      name: /cast hellish rebuke from lineage/i,
    }).querySelector('.fa-wand-sparkles')
  ).not.toBeNull();

  await act(async () => {
    await userEvent.click(
      within(hellishFeature).getByRole('button', {
        name: /cast hellish rebuke from lineage/i,
      })
    );
  });

  const freeCastButton = await screen.findByRole('button', {
    name: /cast hellish rebuke without expending a spell slot/i,
  });
  expect(freeCastButton).toBeEnabled();
  expect(freeCastButton).toHaveTextContent('C');

  await act(async () => {
    await userEvent.click(freeCastButton);
  });

  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: /cast at level/i })
    ).not.toBeInTheDocument()
  );

  expect(onCastSpell).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Hellish Rebuke',
      pendingEffectOnly: true,
    })
  );
  expect(onCastSpell).toHaveBeenCalledWith('action');

  const storageKey =
    'zombiesLineageSpellUses:tiefling-infernal-hellish-rebuke:test-character-id';
  expect(window.localStorage.getItem(storageKey)).toBe('0');

  await waitFor(() =>
    expect(
      within(hellishFeature).getByText(/Uses remaining: 0/i)
    ).toBeInTheDocument()
  );

  await act(async () => {
    await userEvent.click(
      within(hellishFeature).getByRole('button', {
        name: /cast hellish rebuke from lineage/i,
      })
    );
  });

  const disabledFreeCast = await screen.findByRole('button', {
    name: /cast hellish rebuke without expending a spell slot/i,
  });
  expect(disabledFreeCast).toBeDisabled();

  const castButton = await screen.findByRole('button', { name: /^cast$/i });

  await act(async () => {
    await userEvent.click(castButton);
  });

  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: /cast at level/i })
    ).not.toBeInTheDocument()
  );

  expect(onCastSpell).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Hellish Rebuke',
      slotLevel: 1,
      slotType: 'regular',
      level: 1,
    })
  );
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
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
      characterId={TEST_CHARACTER_ID}
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

test('elven lineage spells use wand icon and track uses with persistence and rest reset', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  });

  const onCastSpell = jest.fn();
  const baseForm = {
    race: {
      name: 'Elf',
      speed: 35,
      darkvisionRange: 60,
      elvenLineages: {
        wood: {
          label: 'Wood Elf',
          spellcastingAbilities: ['Wisdom'],
          speed: 35,
        },
      },
      selectedAncestryKey: 'wood',
      selectedAncestry: {
        label: 'Wood Elf',
        spellcastingAbilities: ['Wisdom'],
        speed: 35,
      },
      selectedLineageAbility: 'Wisdom',
    },
    elvenLineageKey: 'wood',
    elvenLineage: {
      label: 'Wood Elf',
      spellcastingAbilities: ['Wisdom'],
      speed: 35,
    },
    elvenLineageAbility: 'Wisdom',
    occupation: [{ Name: 'Ranger', Level: 5 }],
  };

  const commonProps = {
    form: baseForm,
    showFeatures: true,
    handleCloseFeatures: () => {},
    characterId: TEST_CHARACTER_ID,
  };

  const renderFeatures = (extraProps = {}) =>
    render(<Features {...commonProps} {...extraProps} />);

  const firstRender = renderFeatures({
    onCastSpell,
    longRestCount: 0,
    shortRestCount: 0,
  });

  const longstriderTitle = await screen.findByText('Longstrider (Level 3)');
  const longstriderCard = longstriderTitle.closest('.feature-card');
  expect(longstriderCard).not.toBeNull();
  const longstriderWithin = within(longstriderCard);
  const lineageCastButton = longstriderWithin.getByRole('button', {
    name: /cast longstrider from lineage/i,
  });
  expect(lineageCastButton).toBeEnabled();
  expect(
    lineageCastButton.querySelector('i.fa-solid.fa-wand-sparkles')
  ).not.toBeNull();
  expect(
    longstriderWithin.getByText('Uses remaining: 1')
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(lineageCastButton);
  });

  await waitFor(() => {
    expect(
      longstriderWithin.getByText('Uses remaining: 0')
    ).toBeInTheDocument();
  });

  expect(onCastSpell).toHaveBeenCalledTimes(2);
  expect(onCastSpell).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      name: 'Longstrider',
      castingTime: '1 action',
    })
  );
  expect(onCastSpell).toHaveBeenNthCalledWith(2, 'action');

  firstRender.unmount();

  const secondRender = renderFeatures({
    onCastSpell: jest.fn(),
    longRestCount: 0,
    shortRestCount: 0,
  });

  const persistedTitle = await screen.findByText('Longstrider (Level 3)');
  const persistedCard = persistedTitle.closest('.feature-card');
  expect(persistedCard).not.toBeNull();
  const persistedWithin = within(persistedCard);
  expect(
    persistedWithin.getByText('Uses remaining: 0')
  ).toBeInTheDocument();

  secondRender.unmount();

  const thirdRender = renderFeatures({
    onCastSpell: jest.fn(),
    longRestCount: 0,
    shortRestCount: 0,
  });

  await screen.findByText('Longstrider (Level 3)');

  thirdRender.rerender(
    <Features
      {...commonProps}
      onCastSpell={jest.fn()}
      longRestCount={1}
      shortRestCount={0}
    />
  );

  const resetTitle = await screen.findByText('Longstrider (Level 3)');
  const resetCard = resetTitle.closest('.feature-card');
  expect(resetCard).not.toBeNull();
  const resetWithin = within(resetCard);
  await waitFor(() => {
    expect(
      resetWithin.getByText('Uses remaining: 1')
    ).toBeInTheDocument();
  });

  thirdRender.unmount();
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
      characterId={TEST_CHARACTER_ID}
    />
  );

  expect(await screen.findByText('Arcane Recovery')).toBeInTheDocument();

  const featureNameNodes = screen.getAllByText((_, node) =>
    node.classList?.contains('feature-card-name')
  );

  const order = featureNameNodes.map((node) => node.textContent);
  expect(order).toEqual(['Second Wind', 'Action Surge', 'Arcane Recovery']);
});

describe('barbarian weapon mastery feature UI', () => {
  const weapons = {
    club: { name: 'Club', type: 'club', category: 'simple melee', mastery: 'slow' },
    handaxe: { name: 'Handaxe', type: 'handaxe', category: 'simple melee', mastery: 'vex' },
    greataxe: { name: 'Greataxe', type: 'greataxe', category: 'martial melee', mastery: 'cleave' },
    longbow: { name: 'Longbow', type: 'longbow', category: 'martial ranged', mastery: 'slow' },
  };

  const mockFeatureApi = () => {
    apiFetch.mockImplementation((url) => {
      if (url === '/weapons') {
        return Promise.resolve({ ok: true, json: async () => weapons });
      }
      return Promise.resolve({ ok: true, json: async () => ({ features: [] }) });
    });
  };

  test('appears for Barbarian level 1 and renders data-driven mastery slots', async () => {
    mockFeatureApi();
    render(
      <Features
        form={{ occupation: [{ Name: 'Barbarian', Level: 1 }] }}
        showFeatures={true}
        handleCloseFeatures={() => {}}
        characterId={TEST_CHARACTER_ID}
      />
    );

    const title = await screen.findByText('Weapon Mastery');
    const card = title.closest('.feature-card');
    expect(within(card).getByText('0 / 2 selected')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: /view feature/i }));
    expect(screen.getByLabelText('Weapon Mastery 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Weapon Mastery 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Weapon Mastery 3')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /Greataxe/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('option', { name: /Longbow/i })).not.toBeInTheDocument();
  });

  test('does not appear for characters without Barbarian levels', async () => {
    mockFeatureApi();
    render(
      <Features
        form={{ occupation: [{ Name: 'Fighter', Level: 1 }] }}
        showFeatures={true}
        handleCloseFeatures={() => {}}
        characterId={TEST_CHARACTER_ID}
      />
    );
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(screen.queryByText('Weapon Mastery')).not.toBeInTheDocument();
  });

  test('uses Barbarian class level for progression and prevents duplicate saves', async () => {
    mockFeatureApi();
        let character = {
      occupation: [
        { Name: 'Barbarian', Level: 4 },
        { Name: 'Wizard', Level: 6 },
      ],
      classState: { barbarian: { weaponMasteries: { selections: ['greataxe'] } } },
    };
    const handleCharacterChange = (updater) => {
      character = typeof updater === 'function' ? updater(character) : updater;
    };
    render(
      <Features
        form={character}
        showFeatures={true}
        handleCloseFeatures={() => {}}
        characterId={TEST_CHARACTER_ID}
        onCharacterChange={handleCharacterChange}
      />
    );

    const title = await screen.findByText('Weapon Mastery');
    expect(within(title.closest('.feature-card')).getByText('1 / 3 selected')).toBeInTheDocument();
    await userEvent.click(within(title.closest('.feature-card')).getByRole('button', { name: /view feature/i }));
    expect(screen.getByLabelText('Weapon Mastery 3')).toBeInTheDocument();
    const secondSelect = screen.getByLabelText('Weapon Mastery 2');
    expect(within(secondSelect).getByRole('option', { name: /Greataxe/i })).toBeDisabled();
    await userEvent.selectOptions(secondSelect, 'handaxe');
    expect(character.classState.barbarian.weaponMasteries.selections).toEqual(['greataxe', 'handaxe']);
  });
});
