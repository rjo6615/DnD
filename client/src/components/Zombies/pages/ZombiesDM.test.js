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

const armorSlotOptions = [
  { key: 'head', label: 'Head' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'arms', label: 'Arms' },
  { key: 'hands', label: 'Hands' },
  { key: 'legs', label: 'Legs' },
  { key: 'feet', label: 'Feet' },
  { key: 'offHand', label: 'Off Hand' },
];

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
          return Promise.resolve({
            ok: true,
            json: async () => ({
              types: ['Light'],
              categories: ['Shield'],
              slots: armorSlotOptions,
            }),
          });
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
    expect(
      await within(modal).findByRole('columnheader', { name: 'Slot' })
    ).toBeInTheDocument();
    expect(await within(modal).findByText('Chest')).toBeInTheDocument();

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

  test('displays armor slot column in modal table', async () => {
    const armorRecords = [
      { _id: 'armor1', armorName: 'Custom Armor', slot: 'chest' },
    ];
    apiFetch.mockImplementation((url) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/equipment/armor/Camp1':
          return Promise.resolve({ ok: true, json: async () => armorRecords });
        case '/armor/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              types: [],
              categories: [],
              slots: armorSlotOptions,
            }),
          });
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
    expect(
      await within(modal).findByRole('columnheader', { name: 'Slot' })
    ).toBeInTheDocument();
    expect(await within(modal).findByText('Chest')).toBeInTheDocument();

    const insideCreateBtn = within(modal).getByText('Create Armor');
    await userEvent.click(insideCreateBtn);

    const slotLabel = await within(modal).findByText('Slot');
    const slotSelect = slotLabel.nextElementSibling;
    if (!slotSelect) {
      throw new Error('Slot select not found');
    }
    await waitFor(() =>
      expect(slotSelect.querySelectorAll('option')).toHaveLength(
        1 + armorSlotOptions.length
      )
    );
    const slotLabels = Array.from(slotSelect.querySelectorAll('option')).map(
      (option) => option.textContent
    );
    expect(slotLabels).toEqual([
      'Select slot',
      ...armorSlotOptions.map((slot) => slot.label),
    ]);
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

  test('normalizes AI bonuses with full names', async () => {
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
              statBonuses: { Strength: 2 },
              skillBonuses: { Stealth: 3 },
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
    expect(screen.getByPlaceholderText('Stealth')).toHaveValue(3);
  });

  test('renders currency column with adjustment action', async () => {
    const characters = [
      {
        _id: 'char1',
        token: 'Player1',
        characterName: 'Hero',
        occupation: [{ Level: '2', Occupation: 'Wizard' }],
      },
    ];

    apiFetch.mockImplementation((url) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => characters });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    expect(await screen.findByRole('columnheader', { name: 'Currency' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Adjust/i })).toBeInTheDocument();
  });

  test('submits normalized currency adjustments to the API', async () => {
    const characters = [
      {
        _id: 'char1',
        token: 'Player1',
        characterName: 'Hero',
        occupation: [{ Level: '2', Occupation: 'Wizard' }],
      },
    ];
    let charactersRequestCount = 0;
    let currencyRequest;

    apiFetch.mockImplementation((url, options = {}) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          charactersRequestCount += 1;
          return Promise.resolve({ ok: true, json: async () => characters });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/characters/char1/currency':
          currencyRequest = options;
          return Promise.resolve({ ok: true });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const adjustButton = await screen.findByRole('button', { name: /Adjust/i });
    await userEvent.click(adjustButton);

    const copperInput = await screen.findByLabelText(/Copper/i);
    const silverInput = screen.getByLabelText(/Silver/i);
    const goldInput = screen.getByLabelText(/Gold/i);
    const platinumInput = screen.getByLabelText(/Platinum/i);

    await userEvent.clear(copperInput);
    await userEvent.type(copperInput, '15');
    await userEvent.clear(silverInput);
    await userEvent.type(silverInput, '9');
    await userEvent.clear(goldInput);
    await userEvent.type(goldInput, '1');
    await userEvent.clear(platinumInput);
    await userEvent.type(platinumInput, '0');

    const submitButton = screen.getByRole('button', { name: /Update Currency/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(currencyRequest).toBeDefined();
      expect(currencyRequest.method).toBe('PUT');
      expect(JSON.parse(currencyRequest.body)).toEqual({ cp: 5, sp: 0, gp: 2, pp: 0 });
    });

    await waitFor(() => {
      expect(charactersRequestCount).toBeGreaterThanOrEqual(2);
    });
  });
});
