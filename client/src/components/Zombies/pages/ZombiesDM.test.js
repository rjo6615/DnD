import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiFetch from '../../../utils/apiFetch';
import useUser from '../../../hooks/useUser';
jest.mock('../../../utils/apiFetch');
jest.mock('../../../hooks/useUser');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ campaign: 'Camp1' }),
  useNavigate: () => jest.fn(),
}));

jest.mock(
  'socket.io-client',
  () => require('../../../../__mocks__/socket.io-client.js'),
  { virtual: true }
);

const socketModule = require('socket.io-client');

const ZombiesDM = require('./ZombiesDM').default;

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

const accessorySlotOptions = [
  { key: 'eyes', label: 'Eyes' },
  { key: 'wrists', label: 'Wrists' },
  { key: 'neck', label: 'Neck' },
  { key: 'waist', label: 'Waist' },
  { key: 'back', label: 'Back' },
  { key: 'ringLeft', label: 'Ring I' },
  { key: 'ringRight', label: 'Ring II' },
];

const openResourceCard = async (tabLabel, testId) => {
  const tab = await screen.findByRole('tab', { name: tabLabel });
  await userEvent.click(tab);
  return screen.findByTestId(testId);
};

const openResourceCreateForm = async (card) => {
  const toggleButton = within(card).getByRole('button', { name: /Create/i });
  await userEvent.click(toggleButton);
};

describe('ZombiesDM AI generation', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useUser.mockReturnValue({ username: 'dm' });
    const sockets = socketModule.__getMockSockets();
    sockets.length = 0;
    const ioMock = socketModule.__getIoMock();
    ioMock.mockClear();
    ioMock.mockImplementation(() => {
      const socket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      };
      sockets.push(socket);
      return socket;
    });
    const testSocket = socketModule.io();
    expect(testSocket).toBeDefined();
    expect(typeof testSocket.on).toBe('function');
    ioMock.mockClear();
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
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/enemies':
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
            slot: 'chest',
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

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters')
    );

    const card = await openResourceCard('Armor', 'resource-armor-card');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/armor/options'));

    expect(
      await within(card).findByText(/No armor created yet\./i)
    ).toBeInTheDocument();

    await openResourceCreateForm(card);

    await within(card).findByRole('option', { name: 'Light' });

    const promptInput = await within(card).findByPlaceholderText('Describe armor');
    await userEvent.type(promptInput, 'test armor');

    const generateBtn = within(card).getByRole('button', { name: /Generate Armor/i });
    await userEvent.click(generateBtn);

    await waitFor(() => expect(within(card).getByDisplayValue('AI Armor')).toBeInTheDocument());
    expect(within(card).getByDisplayValue('Light')).toBeInTheDocument();
    expect(within(card).getByDisplayValue('Shield')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(card).getByLabelText('Slot')).toHaveValue('chest')
    );
    expect(within(card).getByLabelText('Stealth')).toHaveValue('false');
    expect(within(card).getByLabelText('Cost')).toHaveValue('100');
    expect(within(card).getByLabelText('Max Dex Bonus')).toHaveValue('4');
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
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/enemies':
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
        case '/accessories/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [], slots: accessorySlotOptions }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters')
    );

    const card = await openResourceCard('Armor', 'resource-armor-card');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/armor/options'));

    const armorGrid = await within(card).findByTestId('armor-resource-grid');
    expect(
      within(armorGrid).getByText(/Custom Armor/i)
    ).toBeInTheDocument();
    expect(
      within(armorGrid).getByText(/Slot:\s*Chest/i)
    ).toBeInTheDocument();

    await openResourceCreateForm(card);

    const slotLabel = await within(card).findByText('Slot');
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
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
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
        case '/accessories/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [], slots: accessorySlotOptions }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters')
    );

    const card = await openResourceCard('Items', 'resource-items-card');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/items/options'));

    await openResourceCreateForm(card);

    await within(card).findByRole('option', { name: 'adventuring gear' });

    const promptInput = await within(card).findByPlaceholderText('Describe an item');
    await userEvent.type(promptInput, 'test item');

    const generateBtn = within(card).getByRole('button', { name: /Generate Item/i });
    await userEvent.click(generateBtn);

    await waitFor(() =>
      expect(within(card).getByPlaceholderText('Strength')).toHaveValue(2)
    );
    expect(within(card).getByPlaceholderText('Acrobatics')).toHaveValue(3);
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
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
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
        case '/accessories/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [], slots: accessorySlotOptions }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters')
    );

    const card = await openResourceCard('Items', 'resource-items-card');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/items/options'));

    await openResourceCreateForm(card);

    await within(card).findByRole('option', { name: 'adventuring gear' });

    const promptInput = await within(card).findByPlaceholderText('Describe an item');
    await userEvent.type(promptInput, 'test item');

    const generateBtn = within(card).getByRole('button', { name: /Generate Item/i });
    await userEvent.click(generateBtn);

    await waitFor(() =>
      expect(within(card).getByPlaceholderText('Strength')).toHaveValue(2)
    );
    expect(within(card).getByPlaceholderText('Stealth')).toHaveValue(3);
  });

  test('generates accessory via AI and populates slots and bonuses', async () => {
    apiFetch.mockImplementation((url) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
        case '/equipment/accessories/Camp1':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/accessories/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: ['cloak'], slots: accessorySlotOptions }),
          });
        case '/ai/accessory':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              name: 'AI Accessory',
              category: 'cloak',
              targetSlots: ['neck', 'ringLeft'],
              rarity: 'rare',
              statBonuses: { Wisdom: 1 },
              skillBonuses: { Perception: 2 },
            }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters')
    );

    const card = await openResourceCard('Accessories', 'resource-accessories-card');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/accessories/options'));

    await openResourceCreateForm(card);

    await within(card).findByRole('option', { name: 'cloak' });

    const promptInput = await within(card).findByPlaceholderText('Describe an accessory');
    await userEvent.type(promptInput, 'mystic talisman');

    const generateBtn = within(card).getByRole('button', { name: /Generate Accessory/i });
    await userEvent.click(generateBtn);

    await waitFor(() =>
      expect(within(card).getByDisplayValue('AI Accessory')).toBeInTheDocument()
    );
    expect(within(card).getByDisplayValue('cloak')).toBeInTheDocument();
    expect(within(card).getByPlaceholderText('Enter rarity')).toHaveValue('rare');

    await waitFor(() =>
      expect(
        within(card).getByRole('option', { name: 'Neck' }).selected
      ).toBe(true)
    );
    expect(within(card).getByRole('option', { name: 'Ring I' }).selected).toBe(true);

    await waitFor(() => expect(within(card).getByPlaceholderText('Wisdom')).toHaveValue(1));
    expect(within(card).getByPlaceholderText('Perception')).toHaveValue(2);
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
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
        case '/accessories/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [], slots: accessorySlotOptions }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const grid = await screen.findByTestId('characters-resource-grid');
    expect(
      within(grid).getByRole('button', { name: /Adjust currency for Hero/i })
    ).toBeInTheDocument();
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
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
        case '/characters/char1/currency':
          currencyRequest = options;
          return Promise.resolve({ ok: true });
        case '/accessories/options':
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [], slots: accessorySlotOptions }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const adjustButton = await screen.findByRole('button', {
      name: /Adjust currency for Hero/i,
    });
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

  test('allows the DM to manage combat participants', async () => {
    const characters = [
      {
        _id: 'char1',
        characterName: 'Hero',
        token: 'Player1',
        dex: 14,
        feat: [{ initiative: 1 }],
      },
      { _id: 'char2', characterName: 'Rogue', token: 'Player2', dex: 12 },
    ];
    let combatState = { participants: [], activeTurn: null };
    const combatUpdates = [];

    apiFetch.mockImplementation((url, options = {}) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => characters });
        case '/campaigns/Camp1/combat':
          if (options.method === 'PUT') {
            const payload = JSON.parse(options.body);
            combatUpdates.push(payload);
            combatState = {
              participants: payload.participants || [],
              activeTurn:
                payload.activeTurn === undefined || payload.activeTurn === null
                  ? null
                  : payload.activeTurn,
            };
            return Promise.resolve({ ok: true, json: async () => combatState });
          }
          return Promise.resolve({ ok: true, json: async () => combatState });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    await waitFor(() => expect(socketModule.__getIoMock()).toHaveBeenCalledTimes(1));
    const sockets = socketModule.__getMockSockets();
    const socketInstance = sockets[sockets.length - 1];
    expect(socketInstance).toBeDefined();
    expect(socketInstance.emit).toHaveBeenCalledWith('campaign:join', 'Camp1');

    await screen.findByRole('heading', { name: /Combat Tracker/i });

    const combatHeader = await screen.findByRole('columnheader', { name: /In Combat/i });
    const combatTable = combatHeader.closest('table');
    if (!combatTable) {
      throw new Error('Combat tracker table not found');
    }

    const heroRow = (await within(combatTable).findByText('Hero')).closest('tr');
    if (!heroRow) {
      throw new Error('Hero row not found in combat table');
    }

    const cells = within(heroRow).getAllByRole('cell');
    const initiativeCell = cells[3];
    expect(initiativeCell).toHaveTextContent('3');

    const heroCheckbox = within(heroRow).getByRole('checkbox', {
      name: /Toggle Hero in combat/i,
    });
    await userEvent.click(heroCheckbox);

    await waitFor(() => expect(combatUpdates).toHaveLength(1));
    expect(combatUpdates[0]).toMatchObject({
      participants: [{ characterId: 'char1', initiative: 3 }],
      activeTurn: null,
    });

    const heroSetTurnButton = within(heroRow).getByRole('button', {
      name: /Set Turn/i,
    });
    await userEvent.click(heroSetTurnButton);

    await waitFor(() => expect(combatUpdates).toHaveLength(2));
    expect(combatUpdates[1].activeTurn).toBe(0);

    const nextTurnButton = screen.getByRole('button', { name: /Next Turn/i });
    await userEvent.click(nextTurnButton);

    await waitFor(() => expect(combatUpdates).toHaveLength(3));
    expect(combatUpdates[2].activeTurn).toBe(0);

    expect(
      screen.getByText(/Active Turn:/i).textContent
    ).toContain('Hero');
  });
});
