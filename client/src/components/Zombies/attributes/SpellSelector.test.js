import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpellSelector from './SpellSelector';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

const spellsData = {
  fireball: {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: [],
    duration: 'Instantaneous',
    description: '',
    classes: ['Wizard'],
  },
  'cure-wounds': {
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: [],
    duration: 'Instantaneous',
    description: '',
    classes: ['Cleric'],
  },
  'faerie-fire': {
    name: 'Faerie Fire',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: [],
    duration: 'Concentration, up to 1 minute',
    description: '',
    classes: ['Druid'],
  },
  'burning-hands': {
    name: 'Burning Hands',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self',
    components: [],
    duration: 'Instantaneous',
    description: '',
    damage: '3d6',
    higherLevels:
      'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
    scaling: { 5: '4d6', 11: '5d6', 17: '6d6' },
    classes: ['Sorcerer'],
  },
  'fire-bolt': {
    name: 'Fire Bolt',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: [],
    duration: 'Instantaneous',
    description: '',
    damage: '1d10',
    scaling: { 5: '2d10', 11: '3d10', 17: '4d10' },
    classes: ['Wizard'],
  },
};

beforeEach(() => {
  apiFetch.mockReset();
});

test('filters spells by level', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Wizard', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '3');
  expect(await screen.findByText('Fireball')).toBeInTheDocument();
  expect(screen.queryByText('Cure Wounds')).toBeNull();
});

test('cast button disabled until spell checked and then calls onCastSpell', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) });
  const onCast = jest.fn();
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Wizard', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
      onCastSpell={onCast}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '3');
  const row = await screen.findByText('Fireball');
  const rowEl = row.closest('tr');
  const castBtn = within(rowEl).getAllByRole('button')[1];
  expect(castBtn).toBeDisabled();
  const checkbox = within(rowEl).getByRole('checkbox');
  await userEvent.click(checkbox);
  expect(castBtn).not.toBeDisabled();
  await userEvent.click(castBtn);
  expect(onCast).toHaveBeenCalledWith({ level: 3, damage: undefined });
});

test('saves selected spells', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  const onChange = jest.fn();
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Sorcerer', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
      onSpellsChange={onChange}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '1');
  const checkbox = (await screen.findAllByRole('checkbox'))[0];
  await userEvent.click(checkbox);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(3));
  const lastCall = apiFetch.mock.calls[2];
  expect(lastCall[0]).toBe('/characters/1/spells');
  expect(JSON.parse(lastCall[1].body)).toEqual({
    spells: [
      {
        name: 'Burning Hands',
        level: 1,
        damage: '3d6',
        castingTime: '1 action',
        range: 'Self',
        duration: 'Instantaneous',
        casterType: 'Sorcerer',
        higherLevels:
          'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
        scaling: { 5: '4d6', 11: '5d6', 17: '6d6' },
      },
    ],
    spellPoints: 13,
  });
  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      [
        {
          name: 'Burning Hands',
          level: 1,
          damage: '3d6',
          castingTime: '1 action',
          range: 'Self',
          duration: 'Instantaneous',
          casterType: 'Sorcerer',
          higherLevels:
            'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
          scaling: { 5: '4d6', 11: '5d6', 17: '6d6' },
        },
      ],
      13
    )
  );
});

test('uses Occupation when Name is missing', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  const onChange = jest.fn();
  render(
    <SpellSelector
      form={{
        occupation: [
          { Occupation: 'Wizard', Level: 5, casterProgression: 'full' },
        ],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
      onSpellsChange={onChange}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '3');
  const checkbox = (await screen.findAllByRole('checkbox'))[0];
  await userEvent.click(checkbox);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(3));
  const lastCall = apiFetch.mock.calls[2];
  expect(JSON.parse(lastCall[1].body)).toEqual({
    spells: [
      {
        name: 'Fireball',
        level: 3,
        damage: '',
        castingTime: '1 action',
        range: '150 feet',
        duration: 'Instantaneous',
        casterType: 'Wizard',
      },
    ],
    spellPoints: 13,
  });
  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      [
        {
          name: 'Fireball',
          level: 3,
          damage: '',
          castingTime: '1 action',
          range: '150 feet',
          duration: 'Instantaneous',
          casterType: 'Wizard',
          higherLevels: undefined,
          scaling: undefined,
        },
      ],
      13
    )
  );
});

test('saves cantrip with scaling data', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  const onChange = jest.fn();
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Wizard', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
      onSpellsChange={onChange}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '0');
  const checkbox = (await screen.findAllByRole('checkbox'))[0];
  await userEvent.click(checkbox);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(3));
  const lastCall = apiFetch.mock.calls[2];
  expect(JSON.parse(lastCall[1].body)).toEqual({
    spells: [
      {
        name: 'Fire Bolt',
        level: 0,
        damage: '1d10',
        castingTime: '1 action',
        range: '120 feet',
        duration: 'Instantaneous',
        casterType: 'Wizard',
        scaling: { 5: '2d10', 11: '3d10', 17: '4d10' },
      },
    ],
    spellPoints: 3,
  });
  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      [
        {
          name: 'Fire Bolt',
          level: 0,
          damage: '1d10',
          castingTime: '1 action',
          range: '120 feet',
          duration: 'Instantaneous',
          casterType: 'Wizard',
          higherLevels: undefined,
          scaling: { 5: '2d10', 11: '3d10', 17: '4d10' },
        },
      ],
      3
    )
  );
});

test('modal appears for spells with higherLevels', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Sorcerer', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
      availableSlots={{ 1: 1, 2: 1 }}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '1');
  const row = await screen.findByText('Burning Hands');
  const rowEl = row.closest('tr');
  await userEvent.click(within(rowEl).getByRole('checkbox'));
  const castBtn = within(rowEl).getAllByRole('button')[1];
  await userEvent.click(castBtn);
  expect(await screen.findByText('Cast at Level')).toBeInTheDocument();
});

test('upcasting consumes higher slot and reports extra damage', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) });
  const onCast = jest.fn();
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Sorcerer', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
      onCastSpell={onCast}
      availableSlots={{ 1: 1, 2: 1, 3: 1 }}
    />
  );
  await screen.findByLabelText('Level');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '1');
  const row = await screen.findByText('Burning Hands');
  const rowEl = row.closest('tr');
  await userEvent.click(within(rowEl).getByRole('checkbox'));
  const castBtn = within(rowEl).getAllByRole('button')[1];
  await userEvent.click(castBtn);
  const select = await screen.findByLabelText('Slot Level');
  await userEvent.selectOptions(select, '3');
  await userEvent.click(screen.getByRole('button', { name: 'Cast' }));
  expect(onCast).toHaveBeenCalledWith({
    level: 3,
    damage: '3d6',
    extraDice: { count: 1, sides: 6 },
    levelsAbove: 2,
  });
});

test('renders tabs for multiple classes', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  render(
    <SpellSelector
      form={{
        occupation: [
          { Name: 'Wizard', Level: 5, casterProgression: 'full' },
          { Name: 'Cleric', Level: 5, casterProgression: 'full' },
        ],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  await screen.findByRole('tab', { name: 'Wizard' });
  await screen.findByRole('tab', { name: 'Cleric' });
  expect(screen.queryByLabelText('Class')).toBeNull();

  const panels = screen.getAllByRole('tabpanel');
  const wizardPanel = panels[0];
  const clericPanel = panels[1];

  // Wizard tab is active by default
  await userEvent.selectOptions(
    within(wizardPanel).getByLabelText('Level'),
    '3'
  );
  expect(
    await within(wizardPanel).findByText('Fireball')
  ).toBeInTheDocument();
  expect(within(wizardPanel).queryByText('Cure Wounds')).toBeNull();

  await userEvent.click(screen.getByRole('tab', { name: 'Cleric' }));
  await userEvent.selectOptions(
    within(clericPanel).getByLabelText('Level'),
    '1'
  );
  expect(
    await within(clericPanel).findByText('Cure Wounds')
  ).toBeInTheDocument();
});

test.each(['Paladin', 'Ranger'])(
  '5th-level %s gains 2nd-level slots without cantrips',
  async (cls) => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 4 }) });
    render(
      <SpellSelector
        form={{
          occupation: [{ Name: cls, Level: 5, casterProgression: 'half' }],
          spells: [],
        }}
        show={true}
        handleClose={() => {}}
      />
    );
    const select = await screen.findByLabelText('Level');
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('2');
    expect(options).not.toContain('0');
  }
);

test('full casters include level 0 options', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 14 }) });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Wizard', Level: 5, casterProgression: 'full' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  const select = await screen.findByLabelText('Level');
  const options = Array.from(select.options).map((o) => o.value);
  expect(options).toContain('0');
});

test('level 1 half-caster has no spell slots', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => spellsData });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Paladin', Level: 1, casterProgression: 'half' }],
        spells: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  await waitFor(() => {
    expect(screen.queryByLabelText('Level')).toBeNull();
  });
  expect(
    screen.getByText(/no spellcasting classes available/i)
  ).toBeInTheDocument();
});

test('cleric spells known uses wisdom modifier', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 5 }) });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Cleric', Level: 3, casterProgression: 'full' }],
        wis: 14,
        cha: 10,
        spells: [],
        item: [],
        feat: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  expect(apiFetch.mock.calls[1][0]).toBe(
    '/classes/cleric/features/3?abilityMod=2'
  );
  const label = await screen.findByText('Points Left:');
  await waitFor(() => expect(label.nextSibling).toHaveTextContent('5'));
});

test('druid spells known uses wisdom modifier', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 4 }) });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Druid', Level: 2, casterProgression: 'full' }],
        wis: 14,
        cha: 10,
        spells: [],
        item: [],
        feat: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  expect(apiFetch.mock.calls[1][0]).toBe(
    '/classes/druid/features/2?abilityMod=2'
  );
  const label = await screen.findByText('Points Left:');
  await waitFor(() => expect(label.nextSibling).toHaveTextContent('4'));
});

test('warlock is treated as a spellcasting class using charisma', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ spellsKnown: 5 }) });
  render(
    <SpellSelector
      form={{
        occupation: [{ Name: 'Warlock', Level: 3, casterProgression: 'full' }],
        cha: 14,
        wis: 10,
        spells: [],
        item: [],
        feat: [],
      }}
      show={true}
      handleClose={() => {}}
    />
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  expect(apiFetch.mock.calls[1][0]).toBe(
    '/classes/warlock/features/3?abilityMod=2'
  );
  const select = await screen.findByLabelText('Level');
  const options = Array.from(select.options).map((o) => o.value);
  expect(options).toContain('0');
  const label = await screen.findByText('Points Left:');
  await waitFor(() => expect(label.nextSibling).toHaveTextContent('5'));
});
