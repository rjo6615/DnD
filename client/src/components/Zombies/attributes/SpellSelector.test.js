import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
};

test('filters spells by class and level', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => spellsData });
  render(
    <SpellSelector
      form={{ occupation: [{ Name: 'Wizard', Level: 5 }], spells: [] }}
      show={true}
      handleClose={() => {}}
    />
  );
  await screen.findByLabelText('Class');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '3');
  expect(await screen.findByText('Fireball')).toBeInTheDocument();
  expect(screen.queryByText('Cure Wounds')).toBeNull();
});

test('saves selected spells', async () => {
  apiFetch
    .mockResolvedValueOnce({ ok: true, json: async () => spellsData })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  const onChange = jest.fn();
  render(
    <SpellSelector
      form={{ occupation: [{ Name: 'Wizard', Level: 5 }], spells: [] }}
      show={true}
      handleClose={() => {}}
      onSpellsChange={onChange}
    />
  );
  await screen.findByLabelText('Class');
  await userEvent.selectOptions(screen.getByLabelText('Level'), '3');
  await userEvent.click(await screen.findByText('Fireball'));
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(apiFetch).toHaveBeenLastCalledWith(
    '/characters/1/spells',
    expect.objectContaining({ method: 'PUT' })
  );
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(['Fireball']));
});
