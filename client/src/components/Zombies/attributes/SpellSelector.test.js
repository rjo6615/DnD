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

test('saves selected spells', async () => {
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
  await userEvent.selectOptions(screen.getByLabelText('Level'), '3');
  const checkbox = (await screen.findAllByRole('checkbox'))[0];
  await userEvent.click(checkbox);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(3));
  const lastCall = apiFetch.mock.calls[2];
  expect(lastCall[0]).toBe('/characters/1/spells');
  expect(JSON.parse(lastCall[1].body)).toEqual({
    spells: [
      {
        name: 'Fireball',
        level: 3,
        damage: '',
        castingTime: '1 action',
        range: '150 feet',
        duration: 'Instantaneous',
        classes: ['Wizard'],
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
          classes: ['Wizard'],
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
        classes: ['Wizard'],
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
          classes: ['Wizard'],
        },
      ],
      13
    )
  );
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
