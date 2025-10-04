import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiFetch from '../../../utils/apiFetch';
import useUser from '../../../hooks/useUser';
jest.mock('../../../utils/apiFetch');
jest.mock('../../../hooks/useUser');
jest.mock('../attributes/CampaignMapBoard', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: jest.fn(() => React.createElement('div', { 'data-testid': 'campaign-map-board' })),
  };
});
jest.mock('../attributes/MapModal', () => {
  const React = require('react');
  const actual = jest.requireActual('../attributes/MapModal');
  const mockFn = jest.fn((props) => React.createElement(actual.default, props));
  return {
    __esModule: true,
    default: mockFn,
  };
});
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
const CampaignMapBoard = require('../attributes/CampaignMapBoard').default;
const MapModal = require('../attributes/MapModal').default;

const {
  default: ZombiesDM,
  applyCharacterHealthUpdateToRecords,
  getCharacterCardMeta,
  getCombatRowMeta,
} = require('./ZombiesDM');

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
    CampaignMapBoard.mockClear();
    MapModal.mockClear();
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

  test('map editor indicates required fields and validates image source before submit', async () => {
    apiFetch.mockImplementation((url, options = {}) => {
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
        case '/campaigns/Camp1/maps':
          if (options.method === 'POST') {
            return Promise.resolve({ ok: true, json: async () => ({}) });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({ maps: [], activeMapId: null, map: null }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const mapTab = await screen.findByRole('tab', { name: 'Map' });
    await userEvent.click(mapTab);

    const createButton = await screen.findByTestId('create-map-button');
    await userEvent.click(createButton);

    const modal = await screen.findByTestId('map-editor-modal');
    const modalQueries = within(modal);

    const getRequiredLabel = (labelText) =>
      modalQueries.getByText((_, element) => {
        if (!element || element.tagName.toLowerCase() !== 'label') {
          return false;
        }
        const normalized = (element.textContent || '').replace(/\s+/g, ' ').trim();
        return new RegExp(`^${labelText}\\s*\\*$`, 'i').test(normalized);
      });

    expect(getRequiredLabel('Title')).toBeInTheDocument();
    const titleInput = modalQueries.getByLabelText(/^Title/);
    expect(titleInput).toBeRequired();

    expect(getRequiredLabel('Image URL')).toBeInTheDocument();
    expect(getRequiredLabel('Image File')).toBeInTheDocument();
    expect(getRequiredLabel('Alt Text')).toBeInTheDocument();
    const helperText = modalQueries.getByText(/At least one source is required\./i);
    expect(helperText).toBeInTheDocument();

    await userEvent.type(titleInput, 'New Map');

    const submitButton = modalQueries.getByTestId('map-editor-submit-button');
    await userEvent.click(submitButton);

    const errorMessage = await modalQueries.findByText('Provide an image URL or upload a file.');
    expect(errorMessage).toBeInTheDocument();

    const getMapPostCalls = () =>
      apiFetch.mock.calls.filter(
        ([requestUrl, requestOptions]) =>
          requestUrl === '/campaigns/Camp1/maps' && requestOptions && requestOptions.method === 'POST'
      );

    expect(getMapPostCalls()).toHaveLength(0);

    const imageUrlInput = modalQueries.getByLabelText(/^Image URL/);
    const imageFileInput = modalQueries.getByLabelText(/^Image File/);
    const altTextInput = modalQueries.getByLabelText(/^Alt Text/);

    expect(imageUrlInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('map-editor-image-requirement')
    );
    expect(imageUrlInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('map-editor-image-error')
    );
    expect(imageFileInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('map-editor-image-requirement')
    );
    expect(imageFileInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('map-editor-image-error')
    );

    expect(altTextInput).toBeRequired();

    await userEvent.type(imageUrlInput, 'https://example.com/map.png');

    await waitFor(() =>
      expect(
        modalQueries.queryByText('Provide an image URL or upload a file.')
      ).not.toBeInTheDocument()
    );

    const imageUrlDescribedBy = imageUrlInput.getAttribute('aria-describedby') || '';
    expect(imageUrlDescribedBy).toContain('map-editor-image-requirement');
    expect(imageUrlDescribedBy).not.toContain('map-editor-image-error');

    const imageFileDescribedBy = imageFileInput.getAttribute('aria-describedby') || '';
    expect(imageFileDescribedBy).toContain('map-editor-image-requirement');
    expect(imageFileDescribedBy).not.toContain('map-editor-image-error');

    await userEvent.click(submitButton);

    const altTextError = await modalQueries.findByText('Alt text is required.');
    expect(altTextError).toBeInTheDocument();
    expect(getMapPostCalls()).toHaveLength(0);

    await userEvent.type(altTextInput, 'Forest clearing battle map');

    await waitFor(() =>
      expect(modalQueries.queryByText('Alt text is required.')).not.toBeInTheDocument()
    );

    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(getMapPostCalls()).toHaveLength(1);
    });
  });

  test.skip('generates armor via AI and populates form', async () => {
    apiFetch.mockImplementation((url, options = {}) => {
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
    apiFetch.mockImplementation((url, options = {}) => {
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

  test('character health updates propagate to record cards and combat rows', () => {
    const originalRecord = { _id: 'abc123', health: 12 };
    const records = [originalRecord];

    const updatedRecords = applyCharacterHealthUpdateToRecords({
      records,
      update: { _id: 'abc123', characterId: 'hero-1', health: 7 },
    });

    expect(updatedRecords).not.toBe(records);
    expect(updatedRecords[0]).not.toBe(originalRecord);
    expect(updatedRecords[0].health).toBe(7);
    expect(updatedRecords[0]._id).toBe('abc123');
    expect(updatedRecords[0].characterId).toBe('hero-1');

    const cardMeta = getCharacterCardMeta(updatedRecords[0], 0);
    expect(cardMeta.testId).toBe('character-card-abc123');
    expect(cardMeta.dataAttributes['data-character-id']).toBe('abc123');
    expect(cardMeta.dataAttributes['data-current-hp']).toBe(7);

    const combatMeta = getCombatRowMeta({
      character: updatedRecords[0],
      rowId: 'hero-1',
      participantInfo: { characterId: 'hero-1', currentHp: 12, maxHp: 18 },
      recordIndex: 0,
    });
    expect(combatMeta.testId).toBe('combat-row-hero-1');
    expect(combatMeta.dataAttributes['data-current-hp']).toBe(7);
  });

  test('removes enemy tokens from maps before success status', async () => {
    const enemies = [{ enemyId: 'enemy-1', name: 'Goblin', type: 'humanoid' }];
    let enemiesFetchCount = 0;
    const mapDeleteResolvers = {};

    apiFetch.mockImplementation((url, options = {}) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/combat':
          return Promise.resolve({
            ok: true,
            json: async () => ({ participants: [], activeTurn: null }),
          });
        case '/campaigns/Camp1/enemies':
          enemiesFetchCount += 1;
          if (enemiesFetchCount === 1) {
            return Promise.resolve({ ok: true, json: async () => enemies });
          }
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/enemies/enemy-1':
          if (options.method === 'DELETE') {
            return Promise.resolve({ ok: true, status: 204 });
          }
          break;
        case '/campaigns/Camp1/maps/Map%20Alpha/tokens/enemy-1':
          if (options.method === 'DELETE') {
            return new Promise((resolve) => {
              mapDeleteResolvers.alpha = () => resolve({ ok: true, status: 204 });
            });
          }
          break;
        case '/campaigns/Camp1/maps/Map%20Beta/tokens/enemy-1':
          if (options.method === 'DELETE') {
            return new Promise((resolve) => {
              mapDeleteResolvers.beta = () => resolve({ ok: true, status: 204 });
            });
          }
          break;
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<ZombiesDM />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/characters')
    );

    const sockets = socketModule.__getMockSockets();
    const componentSocket = sockets[sockets.length - 1];
    expect(componentSocket).toBeDefined();
    const mapUpdateHandlerEntry = componentSocket.on.mock.calls.find(
      ([eventName]) => eventName === 'campaign:map:update'
    );
    expect(mapUpdateHandlerEntry).toBeDefined();
    const mapUpdateHandler = mapUpdateHandlerEntry[1];

    const primaryToken = { characterId: 'enemy-1', x: 0.25, y: 0.5 };
    const secondaryToken = { characterId: 'enemy-1', x: 0.6, y: 0.7 };

    await act(async () => {
      mapUpdateHandler({
        maps: [
          { mapId: 'Map Alpha', tokens: { 'enemy-1': primaryToken } },
          { mapId: 'Map Beta', tokens: { 'enemy-1': secondaryToken } },
        ],
        activeMapId: 'Map Alpha',
        tokensByMapId: {
          'Map Alpha': { 'enemy-1': primaryToken },
          'Map Beta': { 'enemy-1': secondaryToken },
        },
        activeMapTokens: { 'enemy-1': primaryToken },
        map: { mapId: 'Map Alpha', tokens: { 'enemy-1': primaryToken } },
      });
    });

    const removeButton = await screen.findByRole('button', { name: 'Remove' });
    await userEvent.click(removeButton);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/campaigns/Camp1/enemies/enemy-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );

    await waitFor(() => {
      expect(mapDeleteResolvers.alpha).toBeInstanceOf(Function);
      expect(mapDeleteResolvers.beta).toBeInstanceOf(Function);
    });

    expect(screen.queryByText('Enemy removed.')).not.toBeInTheDocument();

    await act(async () => {
      mapDeleteResolvers.alpha();
      mapDeleteResolvers.beta();
    });

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/campaigns/Camp1/maps/Map%20Alpha/tokens/enemy-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/campaigns/Camp1/maps/Map%20Beta/tokens/enemy-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );

    await waitFor(() =>
      expect(screen.getByText('Enemy removed.')).toBeInTheDocument()
    );
  });

  test('generates item via AI and populates bonus fields', async () => {
    apiFetch.mockImplementation((url, options = {}) => {
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
    apiFetch.mockImplementation((url, options = {}) => {
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
    apiFetch.mockImplementation((url, options = {}) => {
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

    apiFetch.mockImplementation((url, options = {}) => {
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

  test('allows the DM to generate and save a campaign map as a new entry', async () => {
    const existingMap = {
      mapId: 'map-1',
      title: 'Existing Map',
      imageUrl: 'https://example.com/existing-map.png',
      altText: 'Existing map illustration',
    };
    const generatedMap = {
      title: 'Generated Map',
      imageBase64: 'ZmFrZUJhdHRsZU1hcA==',
      imageType: 'image/png',
      altText: 'Generated map alt text',
    };
    const createdMap = {
      ...generatedMap,
      mapId: 'map-2',
    };
    let savedPayload;

    apiFetch.mockImplementation((url, options = {}) => {
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
        case '/campaigns/Camp1/maps':
          if (options.method === 'POST') {
            savedPayload = JSON.parse(options.body);
            return Promise.resolve({
              ok: true,
              json: async () => ({
                maps: [existingMap, createdMap],
                activeMapId: createdMap.mapId,
                map: createdMap,
              }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: [existingMap],
              activeMapId: existingMap.mapId,
              map: existingMap,
            }),
          });
        case '/ai/map':
          return Promise.resolve({ ok: true, json: async () => generatedMap });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const mapTab = await screen.findByRole('tab', { name: 'Map' });
    await userEvent.click(mapTab);

    const mapCard = await screen.findByTestId('resource-map-card');

    const mapList = await within(mapCard).findByTestId('map-list');
    const existingListItem = within(mapList).getByTestId('map-list-item-map-1');
    expect(within(existingListItem).getByText('Existing Map')).toBeInTheDocument();
    expect(
      within(existingListItem).getByTestId('map-active-badge-map-1')
    ).toBeInTheDocument();

    const promptInput = within(mapCard).getByPlaceholderText(
      'Describe the map you want to generate'
    );
    await userEvent.type(promptInput, 'dark forest');

    const generateButton = within(mapCard).getByRole('button', { name: /Generate Map/i });
    await userEvent.click(generateButton);

    await screen.findByText('Map generated.');

    await waitFor(() => {
      expect(within(mapCard).getByText('Generated Map')).toBeInTheDocument();
      const generatedImage = within(mapCard).getByRole('img', {
        name: /Generated map alt text/i,
      });
      expect(generatedImage.getAttribute('src')).toContain(
        generatedMap.imageBase64
      );
    });

    const saveNewButton = within(mapCard).getByTestId('save-map-new-button');
    await userEvent.click(saveNewButton);

    await screen.findByText('Map saved.');

    expect(savedPayload).toEqual({
      map: generatedMap,
      prompt: 'dark forest',
      activate: true,
    });

    await waitFor(() => {
      const updatedList = within(mapCard).getByTestId('map-list');
      const newListItem = within(updatedList).getByTestId('map-list-item-map-2');
      expect(within(newListItem).getByText('Generated Map')).toBeInTheDocument();
      expect(
        within(newListItem).getByTestId('map-active-badge-map-2')
      ).toBeInTheDocument();
    });
  });

  test('allows uploading a map image file when creating a campaign map', async () => {
    const mockBase64 = 'Zm9vYmFy';
    const originalFileReader = global.FileReader;
    const fileReaderMock = jest.fn(() => ({
      onload: null,
      onerror: null,
      readAsDataURL(file) {
        if (this.onload) {
          this.result = `data:${file.type};base64,${mockBase64}`;
          this.onload({ target: { result: this.result } });
        }
      },
    }));
    global.FileReader = fileReaderMock;

    const createdMap = {
      mapId: 'map-file',
      title: 'Uploaded Map',
      imageBase64: mockBase64,
      imageType: 'image/png',
      altText: 'Uploaded alt text',
    };
    let savedPayload;

    apiFetch.mockImplementation((url, options = {}) => {
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
        case '/campaigns/Camp1/maps':
          if (options.method === 'POST') {
            savedPayload = JSON.parse(options.body);
            return Promise.resolve({
              ok: true,
              json: async () => ({
                maps: [createdMap],
                activeMapId: createdMap.mapId,
                map: createdMap,
              }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({ maps: [], activeMapId: null, map: null }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    try {
      render(<ZombiesDM />);

      const mapTab = await screen.findByRole('tab', { name: 'Map' });
      await userEvent.click(mapTab);

      const createButton = await screen.findByTestId('create-map-button');
      await userEvent.click(createButton);

      const modal = await screen.findByTestId('map-editor-modal');
      const titleInput = within(modal).getByLabelText(/^Title/);
      await userEvent.type(titleInput, 'Uploaded Map');

      const altTextInput = within(modal).getByLabelText(/^Alt Text/);
      await userEvent.type(altTextInput, 'Uploaded alt text');

      const fileInput = within(modal).getByLabelText(/^Image File/);
      const file = new File(['file-data'], 'map.png', { type: 'image/png' });
      await userEvent.upload(fileInput, file);

      await waitFor(() => expect(fileReaderMock).toHaveBeenCalled());

      const submitButton = within(modal).getByTestId('map-editor-submit-button');
      await userEvent.click(submitButton);

      await screen.findByText('Map saved.');

      await waitFor(() => expect(savedPayload).toBeDefined());

      expect(savedPayload).toEqual({
        map: {
          title: 'Uploaded Map',
          altText: 'Uploaded alt text',
          imageBase64: mockBase64,
          imageType: 'image/png',
        },
        activate: true,
      });
    } finally {
      if (originalFileReader) {
        global.FileReader = originalFileReader;
      } else {
        delete global.FileReader;
      }
    }
  });

  test('create map modal resets fields after viewing another map', async () => {
    const existingMap = {
      mapId: 'map-1',
      title: 'Existing Map',
      imageUrl: 'https://example.com/map.png',
      altText: 'Existing map alt text',
    };

    const originalFileReader = global.FileReader;
    const fileReaderMock = jest.fn(() => ({
      onload: null,
      onerror: null,
      result: 'data:image/png;base64,mock',
      readAsDataURL() {
        if (typeof this.onload === 'function') {
          this.onload();
        }
      },
    }));
    global.FileReader = fileReaderMock;

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
        case '/campaigns/Camp1/maps':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: [existingMap],
              activeMapId: existingMap.mapId,
              map: existingMap,
            }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    try {
      render(<ZombiesDM />);

      const mapTab = await screen.findByRole('tab', { name: 'Map' });
      await userEvent.click(mapTab);

      const renameButton = await screen.findByTestId('map-rename-button-map-1');
      await userEvent.click(renameButton);

      const modal = await screen.findByTestId('map-editor-modal');
      const modalQueries = within(modal);

      expect(modalQueries.getByLabelText(/^Title/)).toHaveValue('Existing Map');
      expect(modalQueries.getByLabelText(/^Image URL/)).toHaveValue(
        'https://example.com/map.png'
      );
      expect(modalQueries.getByLabelText(/^Alt Text/)).toHaveValue('Existing map alt text');

      const renameFileInput = modalQueries.getByLabelText(/^Image File/);
      const file = new File(['data'], 'existing.png', { type: 'image/png' });
      await userEvent.upload(renameFileInput, file);
      expect(renameFileInput.files).toHaveLength(1);

      const cancelButton = modalQueries.getByRole('button', { name: 'Cancel' });
      await userEvent.click(cancelButton);

      const createButton = await screen.findByTestId('create-map-button');
      await userEvent.click(createButton);

      const createModalQueries = within(modal);

      await waitFor(() =>
        expect(createModalQueries.getByLabelText(/^Title/)).toHaveValue('')
      );
      expect(createModalQueries.getByLabelText(/^Image URL/)).toHaveValue('');
      expect(createModalQueries.getByLabelText(/^Alt Text/)).toHaveValue('');

      const createFileInput = createModalQueries.getByLabelText(/^Image File/);
      expect(createFileInput.files).toHaveLength(0);
      expect(createFileInput.value).toBe('');
    } finally {
      if (originalFileReader) {
        global.FileReader = originalFileReader;
      } else {
        delete global.FileReader;
      }
    }
  });

  test('allows the DM to activate a different saved map', async () => {
    const primaryMap = {
      mapId: 'map-1',
      title: 'Primary Map',
    };
    const secondaryMap = {
      mapId: 'map-2',
      title: 'Secondary Map',
    };
    let activationPayload;

    apiFetch.mockImplementation((url, options = {}) => {
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
        case '/campaigns/Camp1/maps':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: [primaryMap, secondaryMap],
              activeMapId: primaryMap.mapId,
              map: primaryMap,
            }),
          });
        case '/campaigns/Camp1/maps/map-2':
          activationPayload = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: [primaryMap, secondaryMap],
              activeMapId: secondaryMap.mapId,
              map: secondaryMap,
            }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const mapTab = await screen.findByRole('tab', { name: 'Map' });
    await userEvent.click(mapTab);

    const mapCard = await screen.findByTestId('resource-map-card');
    const secondaryActivateButton = await within(mapCard).findByTestId(
      'map-activate-button-map-2'
    );

    await userEvent.click(secondaryActivateButton);

    await screen.findByText('Active map updated.');

    expect(activationPayload).toEqual({ active: true });

    const updatedListItem = within(mapCard).getByTestId('map-list-item-map-2');
    const activeBadge = within(updatedListItem).getByTestId(
      'map-active-badge-map-2'
    );
    expect(activeBadge).toBeInTheDocument();
    const activeButton = within(updatedListItem).getByTestId('map-activate-button-map-2');
    expect(activeButton).toBeDisabled();
    const inactiveButton = within(mapCard).getByTestId('map-activate-button-map-1');
    expect(inactiveButton).not.toBeDisabled();
  });

  test('updates the map list when a socket event is received', async () => {
    const initialMap = {
      mapId: 'map-1',
      title: 'Initial Map',
    };
    const socketMaps = [initialMap];

    apiFetch.mockImplementation((url, options = {}) => {
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
        case '/campaigns/Camp1/maps':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: socketMaps,
              activeMapId: initialMap.mapId,
              map: initialMap,
            }),
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const mapTab = await screen.findByRole('tab', { name: 'Map' });
    await userEvent.click(mapTab);

    const mapCard = await screen.findByTestId('resource-map-card');
    await waitFor(() => {
      const sockets = socketModule.__getMockSockets();
      expect(sockets.length).toBeGreaterThan(0);
      const activeSocket = sockets[sockets.length - 1];
      expect(activeSocket).toBeDefined();
      const handlerCall = activeSocket.on.mock.calls.find(
        ([eventName]) => eventName === 'campaign:map:update'
      );
      expect(handlerCall).toBeDefined();
    });

    const sockets = socketModule.__getMockSockets();
    const socketInstance = sockets[sockets.length - 1];
    const mapUpdateHandler = socketInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'campaign:map:update'
    )[1];

    const updatedMap = {
      mapId: 'map-2',
      title: 'Updated Map',
    };

    mapUpdateHandler({
      maps: [updatedMap],
      activeMapId: updatedMap.mapId,
      map: updatedMap,
    });

    await waitFor(() => {
      const list = within(mapCard).getByTestId('map-list');
      expect(within(list).getByText('Updated Map')).toBeInTheDocument();
    });
  });

  test('passes campaign tokens to the board component and updates on socket events', async () => {
    const characters = [
      { _id: 'hero-1', characterName: 'Hero One', diceColor: '#3366ff' },
      { _id: 'hero-2', characterName: 'Hero Two', diceColor: '#cc0000' },
    ];

    const mapTokens = {
      'map-1': {
        'hero-1': { characterId: 'hero-1', x: 0.1, y: 0.2 },
      },
    };

    const activeMap = {
      mapId: 'map-1',
      title: 'Active Map',
      tokens: mapTokens['map-1'],
    };

    apiFetch.mockImplementation((url, options = {}) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => characters });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/combat':
          return Promise.resolve({
            ok: true,
            json: async () => ({ participants: [], activeTurn: null }),
          });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/maps':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: [activeMap],
              activeMapId: activeMap.mapId,
              map: activeMap,
              tokensByMapId: mapTokens,
              activeMapTokens: mapTokens['map-1'],
            }),
          });
        case '/campaigns/Camp1/maps/map-1/tokens/hero-1':
          if (options.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          break;
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<ZombiesDM />);

    const mapTab = await screen.findByRole('tab', { name: 'Map' });
    await userEvent.click(mapTab);

    await waitFor(() => {
      expect(CampaignMapBoard).toHaveBeenCalled();
    });

    const initialBoardCall = CampaignMapBoard.mock.calls
      .map(([props]) => props)
      .find((props) => props && props.map && props.map.mapId === 'map-1');

    expect(initialBoardCall).toBeDefined();
    expect(initialBoardCall.disabled).toBe(false);
    expect(initialBoardCall.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          characterId: 'hero-1',
          x: 0.1,
          y: 0.2,
          color: '#3366ff',
        }),
      ])
    );

    const sockets = socketModule.__getMockSockets();
    const socketInstance = sockets[sockets.length - 1];
    const mapUpdateHandler = socketInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'campaign:map:update'
    )[1];

    mapUpdateHandler({
      tokensByMapId: {
        'map-1': {
          'hero-1': { characterId: 'hero-1', x: 0.25, y: 0.5 },
          'hero-2': { characterId: 'hero-2', x: 0.75, y: 0.8 },
        },
      },
      activeMapTokens: {
        'hero-1': { characterId: 'hero-1', x: 0.25, y: 0.5 },
        'hero-2': { characterId: 'hero-2', x: 0.75, y: 0.8 },
      },
    });

    await waitFor(() => {
      const latestCall = CampaignMapBoard.mock.calls[CampaignMapBoard.mock.calls.length - 1][0];
      expect(latestCall.tokens).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            characterId: 'hero-1',
            x: 0.25,
            y: 0.5,
            color: '#3366ff',
          }),
          expect.objectContaining({
            characterId: 'hero-2',
            x: 0.75,
            y: 0.8,
            color: '#cc0000',
          }),
        ])
      );
    });

    apiFetch.mockClear();

    const latestBoardProps = CampaignMapBoard.mock.calls[CampaignMapBoard.mock.calls.length - 1][0];
    expect(typeof latestBoardProps.onTokenRemove).toBe('function');

    await act(async () => {
      const result = await latestBoardProps.onTokenRemove({
        characterId: 'hero-1',
        mapId: 'map-1',
      });
      expect(result).toBe(true);
    });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/campaigns/Camp1/maps/map-1/tokens/hero-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    await waitFor(() => {
      const updatedProps = CampaignMapBoard.mock.calls[CampaignMapBoard.mock.calls.length - 1][0];
      const hasHeroToken = (updatedProps.tokens || []).some(
        (token) => token.characterId === 'hero-1'
      );
      expect(hasHeroToken).toBe(false);
    });
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
      participants: [
        { characterId: 'char1', initiative: 3, displayName: 'Hero' },
      ],
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

  test('opens map placement modal for enemies and persists placement moves', async () => {
    const enemies = [
      {
        enemyId: 'enemy-1',
        name: 'Goblin',
        displayType: 'Humanoid',
      },
    ];
    const mapsPayload = {
      maps: [
        {
          mapId: 'map-123',
          title: 'Dungeon',
          tokens: {},
        },
      ],
      activeMapId: 'map-123',
      map: {
        mapId: 'map-123',
        title: 'Dungeon',
        tokens: {},
      },
      tokensByMapId: {
        'map-123': {},
      },
    };

    apiFetch.mockImplementation((url, options = {}) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/combat':
          return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => enemies });
        case '/campaigns/Camp1/maps':
          return Promise.resolve({ ok: true, json: async () => mapsPayload });
        case '/monsters':
          return Promise.resolve({ ok: true, json: async () => [] });
        default:
          if (
            url.startsWith('/campaigns/Camp1/maps/') &&
            options.method === 'PUT'
          ) {
            return Promise.resolve({ ok: true, json: async () => ({}) });
          }
          if (
            url.startsWith('/campaigns/Camp1/maps/') &&
            options.method === 'DELETE'
          ) {
            return Promise.resolve({ ok: true });
          }
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const enemiesCard = await openResourceCard('Enemies', 'resource-enemies-card');

    await waitFor(() => expect(within(enemiesCard).getByText('Goblin')).toBeInTheDocument());

    const placeButton = within(enemiesCard).getByRole('button', { name: 'Place on Map' });

    MapModal.mockClear();

    await userEvent.click(placeButton);

    let placementProps;
    await waitFor(() => {
      const placementCalls = MapModal.mock.calls
        .map(([props]) => props)
        .filter((props) => props && props.readOnly === false && typeof props.onTokenMove === 'function');
      expect(placementCalls.length).toBeGreaterThan(0);
      placementProps = placementCalls[placementCalls.length - 1];
      expect(placementProps.show).toBe(true);
      expect(placementProps.currentCharacterId).toBe('enemy-1');
    });

    apiFetch.mockClear();

    await expect(
      placementProps.onTokenMove({
        mapId: 'map-123',
        characterId: 'enemy-1',
        x: 1.7,
        y: -0.3,
      })
    ).resolves.toBe(true);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/campaigns/Camp1/maps/map-123/tokens/enemy-1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: 1, y: 0 }),
        })
      );
    });

    apiFetch.mockClear();

    await expect(
      placementProps.onTokenRemove({
        mapId: 'map-123',
        characterId: 'enemy-1',
      })
    ).resolves.toBe(true);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/campaigns/Camp1/maps/map-123/tokens/enemy-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
  test('opens the d20 roller modal when clicking the Roll button in enemies form', async () => {
    const characters = [
      { _id: 'hero-1', characterName: 'Hero One', diceColor: '#3366ff' },
    ];

    apiFetch.mockImplementation((url, options = {}) => {
      switch (url) {
        case '/campaigns/Camp1/characters':
          return Promise.resolve({ ok: true, json: async () => characters });
        case '/campaigns/dm/dm/Camp1':
          return Promise.resolve({ ok: true, json: async () => ({ players: [] }) });
        case '/users':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/combat':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              participants: [{ characterId: 'hero-1', initiative: 15 }],
              activeTurn: 0,
            }),
          });
        case '/campaigns/Camp1/enemies':
          return Promise.resolve({ ok: true, json: async () => [] });
        case '/campaigns/Camp1/maps':
          return Promise.resolve({
            ok: true,
            json: async () => ({
              maps: [],
              activeMapId: null,
              map: null,
              tokensByMapId: {},
              activeMapTokens: {},
            }),
          });
        case '/monsters':
          return Promise.resolve({
            ok: true,
            json: async () => [{ index: 'goblin', name: 'Goblin' }],
          });
        default:
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    });

    render(<ZombiesDM />);

    const enemiesTab = await screen.findByRole('tab', { name: 'Enemies' });
    await userEvent.click(enemiesTab);

    const rollButton = await screen.findByRole('button', { name: /^Roll$/i });
    await userEvent.click(rollButton);

    const modal = await screen.findByRole('dialog', { name: /Roll D20/i });
    expect(
      within(modal).getByRole('button', { name: /roll a d20/i })
    ).toBeInTheDocument();
  });


});
