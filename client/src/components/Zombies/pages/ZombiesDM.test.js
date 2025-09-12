import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiFetch from '../../../utils/apiFetch';
import useUser from '../../../hooks/useUser';
import ZombiesDM from './ZombiesDM';
jest.mock('../../../utils/apiFetch');
jest.mock('../../../hooks/useUser');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ campaign: 'Camp1' }),
  useNavigate: () => jest.fn(),
}));

describe('ZombiesDM AI generation', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useUser.mockReturnValue({ username: 'dm' });
  });

  test.skip('generates armor via AI and populates form', async () => {
    apiFetch.mockImplementation((url) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/equipment/armor/Camp1':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/armor/options':
          return Promise.resolve({ ok: true, json: async () => ({ types: ['Light'], categories: ['Shield'] }) });
        case '/ai/armor':
          return Promise.resolve({ ok: true, json: async () => ({
            name: 'AI Armor',
            type: 'Light',
            category: 'Shield',
            armorBonus: 2,
            maxDex: 4,
            strength: 10,
            stealth: false,
            weight: 20,
            cost: 100,
          }) });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters'));

    const openModalBtn = screen.getAllByText('Create Armor')[0];
    await userEvent.click(openModalBtn);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/armor/options'));

    const modal = await screen.findByRole('dialog');
    const insideCreateBtn = within(modal).getByText('Create Armor');
    await userEvent.click(insideCreateBtn);

    await screen.findByRole('option', { name: 'Light' });

    const promptInput = await screen.findByPlaceholderText('Describe armor');
    await userEvent.type(promptInput, 'test armor');

    const generateBtn = screen.getByRole('button', { name: /Generate Armor/i });
    await userEvent.click(generateBtn);

    await waitFor(() => expect(screen.getByDisplayValue('AI Armor')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Light')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Shield')).toBeInTheDocument();
    expect(screen.getByLabelText('Stealth')).toHaveValue('false');
    expect(screen.getByLabelText('Cost')).toHaveValue('100');
    expect(screen.getByLabelText('Max Dex Bonus')).toHaveValue('4');
  });

  test('generates item via AI and populates bonus fields', async () => {
    apiFetch.mockImplementation((url) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/equipment/items/Camp1':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/items/options':
          return Promise.resolve({ ok: true, json: async () => ({ categories: ['adventuring gear'] }) });
        case '/ai/item':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              name: 'AI Item',
              category: 'adventuring gear',
              statBonuses: { str: 2 },
              skillBonuses: { acrobatics: 3 },
            }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters'));

    const openModalBtn = screen.getAllByText('Create Item')[0];
    await userEvent.click(openModalBtn);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/items/options'));

    const modal = await screen.findByRole('dialog');
    const insideCreateBtn = within(modal).getByText('Create Item');
    await userEvent.click(insideCreateBtn);

    await screen.findByRole('option', { name: 'adventuring gear' });

    const promptInput = await screen.findByPlaceholderText('Describe an item');
    await userEvent.type(promptInput, 'test item');

    const generateBtn = screen.getByRole('button', { name: /Generate with AI/i });
    await userEvent.click(generateBtn);

    await waitFor(() => expect(screen.getByPlaceholderText('Strength')).toHaveValue(2));
    expect(screen.getByPlaceholderText('Acrobatics')).toHaveValue(3);
  });
});
