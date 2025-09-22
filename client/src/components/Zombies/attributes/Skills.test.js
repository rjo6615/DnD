import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Skills, { rollSkill } from './Skills';
import apiFetch from '../../../utils/apiFetch';

jest.mock('../../../utils/apiFetch');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

describe('rollSkill critical and fumble events', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('dispatches critical event on natural 20', () => {
    const listener = jest.fn();
    window.addEventListener('critical-hit', listener);
    jest.spyOn(Math, 'random').mockReturnValue(0.95); // yields 20
    rollSkill(0);
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].detail).toContain('critical');
    window.removeEventListener('critical-hit', listener);
  });

  test('dispatches fumble event on natural 1', () => {
    const listener = jest.fn();
    window.addEventListener('critical-failure', listener);
    jest.spyOn(Math, 'random').mockReturnValue(0); // yields 1
    rollSkill(0);
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].detail).toContain('fumble');
    window.removeEventListener('critical-failure', listener);
  });
});

describe('Skills expertise toggle', () => {
  test('enables and toggles expertise for background proficient skill', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ proficient: false, expertise: true }),
    });

    render(
      <Skills
        form={{
          background: { skills: { acrobatics: { proficient: true } } },
          allowedExpertise: ['acrobatics'],
          expertisePoints: 1,
          item: [],
          feat: [],
          race: {},
          skills: {},
        }}
        showSkill={true}
        handleCloseSkill={() => {}}
        totalLevel={1}
        strMod={0}
        dexMod={0}
        conMod={0}
        intMod={0}
        chaMod={0}
        wisMod={0}
      />
    );

    const row = await screen.findByText('Acrobatics');
    const expertiseCheckbox = within(row.closest('tr')).getAllByRole('checkbox')[1];
    expect(expertiseCheckbox.disabled).toBe(false);

    await userEvent.click(expertiseCheckbox);
    await waitFor(() => expect(expertiseCheckbox).toBeChecked());
  });
});

describe('item skill bonuses', () => {
  test('applies bonuses from item skillBonuses object', async () => {
    render(
      <Skills
        form={{
          equipment: {
            ringLeft: { name: 'Ring of Agility', skillBonuses: { acrobatics: 2 }, source: 'item' },
          },
          item: [],
          feat: [],
          race: {},
          skills: {},
        }}
        showSkill={true}
        handleCloseSkill={() => {}}
        totalLevel={1}
        strMod={0}
        dexMod={0}
        conMod={0}
        intMod={0}
        chaMod={0}
        wisMod={0}
      />
    );

    const row = await screen.findByText('Acrobatics');
    expect(within(row.closest('tr')).getByText('2')).toBeInTheDocument();
  });

});
