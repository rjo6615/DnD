import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import hasteIcon from '../../../images/spell-haste-icon.png';
import dragonWingsIcon from '../../../images/dragon-wings-icon.png';
import adrenalineRushIcon from '../../../images/adrenaline-rush.png';
import speakWithAnimalsIcon from '../../../images/speak-with-animal.png';
import largeFormIcon from '../../../images/large-form-icon.png';
import { EQUIPMENT_SLOT_KEYS } from '../attributes/equipmentSlots';

jest.mock('../../../utils/apiFetch');
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));
import apiFetch from '../../../utils/apiFetch';
import { io as mockSocketIo } from 'socket.io-client';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

jest.mock('../../../utils/diceBoxManager', () => {
  const actual = jest.requireActual('../../../utils/diceBoxManager');
  return {
    ...actual,
    registerDiceBoxContainer: jest.fn(() => () => {}),
    subscribeToDiceBoxAvailability: jest.fn(() => () => {}),
    isDiceBoxReady: jest.fn(() => false),
    rollDiceWithBox: jest.fn(),
  };
});

const mockCharacterInfoProps = { current: null };
jest.mock('../attributes/CharacterInfo', () => (props) => {
  mockCharacterInfoProps.current = props;
  return null;
});
jest.mock('../attributes/Stats', () => () => null);
const mockSkillsModalProps = { current: null };
const mockDockedSkillsModalProps = { current: null };
jest.mock('../attributes/Skills', () => (props) => {
  mockSkillsModalProps.current = props;

  if (props && typeof props.isDocked !== 'undefined') {
    mockDockedSkillsModalProps.current = props.isDocked ? props : null;
  }

  return props.showSkill ? <div data-testid="skills-modal" /> : null;
});
jest.mock('../attributes/Feats', () => () => null);
jest.mock('../../Weapons/WeaponList', () => () => null);
var mockUpdateDamage;
var mockCalcDamage;
var mockOpenAttack;
var mockOpenDice;
jest.mock('../attributes/PlayerTurnActions', () => {
  const React = require('react');
  mockUpdateDamage = jest.fn();
  mockCalcDamage = jest.fn(() => ({ total: 7, breakdown: '' }));
  mockOpenAttack = jest.fn();
  mockOpenDice = jest.fn();
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        updateDamageValueWithAnimation: mockUpdateDamage,
        openAttackModal: mockOpenAttack,
        openDiceRoller: mockOpenDice,
      }));
      return null;
    }),
    calculateDamage: mockCalcDamage,
  };
});
jest.mock('../../Armor/ArmorList', () => () => null);
jest.mock('../../Items/ItemList', () => () => null);
jest.mock('../attributes/Help', () => () => null);
jest.mock('../attributes/BackgroundModal', () => () => null);
const mockInventoryModalProps = { current: null };
const mockDockedInventoryModalProps = { current: null };
jest.mock('../attributes/InventoryModal', () => (props) => {
  mockInventoryModalProps.current = props;
  if (props && typeof props.isDocked !== 'undefined') {
    mockDockedInventoryModalProps.current = props.isDocked ? props : null;
  }
  return null;
});
const mockEquipmentModalProps = { current: null };
jest.mock('../attributes/EquipmentModal', () => (props) => {
  mockEquipmentModalProps.current = props;
  return null;
});
const mockShopModalProps = { current: null };
jest.mock('../attributes/ShopModal', () => (props) => {
  mockShopModalProps.current = props;
  return null;
});
const mockMapModalProps = { current: null };
jest.mock('../attributes/MapModal', () => (props) => {
  mockMapModalProps.current = props;
  return props.show ? <div data-testid="map-modal" /> : null;
});
const mockOnCastSpell = { current: null };
const mockHandleClose = { current: null };
let socketStub;
jest.mock('../attributes/SpellSelector', () => (props) => {
  mockOnCastSpell.current = props.onCastSpell;
  mockHandleClose.current = props.handleClose;
  return props.show ? <div data-testid="spell-selector" /> : null;
});
const mockFeaturesModalProps = { current: null };
jest.mock('../attributes/Features', () => (props) => {
  mockFeaturesModalProps.current = props;
  return null;
});

import ZombiesCharacterSheet, { buildFooterConditions, getFooterConditionLabel, getFooterConditionSummary } from './ZombiesCharacterSheet';

describe('footer condition helpers', () => {
  const normalize = (value) => (Array.isArray(value) ? value : []);

  test('includes active rage in the condition collection and removes inactive rage', () => {
    const active = {
      classState: { barbarian: { rage: { active: true, current: 1 } } },
      occupation: [{ Name: 'Barbarian', Level: 3 }],
      conditions: [],
    };
    expect(buildFooterConditions(active, normalize)).toEqual([
      { id: 'rage-condition', icon: '🔥', name: 'Rage', color: '#f0733f' },
    ]);
    expect(buildFooterConditions({ ...active, classState: { barbarian: { rage: { active: false, current: 1 } } } }, normalize)).toEqual([]);
  });

  test('does not duplicate rage and preserves other conditions', () => {
    const character = {
      classState: { barbarian: { rage: { active: true, current: 1 } } },
      occupation: [{ Name: 'Barbarian', Level: 3 }],
      conditions: [{ id: 'rage', name: 'Rage' }, { id: 'poisoned', name: 'Poisoned' }],
    };
    expect(buildFooterConditions(character, normalize)).toEqual(character.conditions);
  });


  test('includes active Reckless Attack with multi-line display data', () => {
    const character = {
      classState: { barbarian: { recklessAttack: { active: true } } },
      occupation: [{ Name: 'Barbarian', Level: 3 }],
      conditions: [],
    };

    expect(buildFooterConditions(character, normalize)).toEqual([
      {
        id: 'reckless-attack-effect',
        icon: '⚔️',
        name: 'Reckless Attack',
        displayLines: ['Reckless', 'Attack'],
        color: '#f59e0b',
      },
    ]);
  });

  test('formats empty, singular, and plural condition labels', () => {
    expect(getFooterConditionLabel(0)).toBe('No conditions');
    expect(getFooterConditionLabel(1)).toBe('1 condition');
    expect(getFooterConditionLabel(2)).toBe('2 conditions');
  });

  test('summarizes active conditions for rendering inside the existing pill', () => {
    expect(getFooterConditionSummary([])).toMatchObject({ empty: true, label: 'No conditions' });
    expect(getFooterConditionSummary([{ id: 'rage', icon: '🔥', name: 'Rage' }])).toMatchObject({
      empty: false,
      label: 'Rage',
      primaryCondition: { id: 'rage', icon: '🔥', name: 'Rage' },
      overflowCount: 0,
    });
    expect(getFooterConditionSummary([{ id: 'rage', icon: '🔥', name: 'Rage' }, { id: 'poisoned', name: 'Poisoned' }])).toMatchObject({ label: 'Rage +1', overflowCount: 1 });
    expect(getFooterConditionSummary([{ id: 'rage', icon: '🔥', name: 'Rage' }, { id: 'poisoned', name: 'Poisoned' }, { id: 'frightened', name: 'Frightened' }])).toMatchObject({ label: 'Rage +2', overflowCount: 2 });
  });
});


test('active conditions sparkle opens modal with shared active entries and closes', async () => {
  apiFetch.mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('/characters/1')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          _id: '1',
          characterName: 'Hero',
          campaign: 'test-campaign',
          health: 20,
          currentHp: 20,
          str: 10,
          dex: 10,
          con: 10,
          occupation: [{ Name: 'Barbarian', Level: 3 }],
          conditions: [{ id: 'poisoned', name: 'Poisoned', icon: '☠️' }],
          classState: {
            barbarian: {
              rage: { active: true, current: 1 },
              recklessAttack: { active: true },
            },
          },
          feat: [],
          equipment: {},
        }),
      });
    }
    return defaultApiFetchImplementation(url);
  });

  render(<ZombiesCharacterSheet />);

  expect(await screen.findByText('Rage +2')).toBeInTheDocument();

  const trigger = await screen.findByRole('button', { name: /view active conditions/i });
  expect(trigger.querySelector('svg')).not.toBeNull();

  await userEvent.click(trigger);
  const modalTitle = await screen.findByText('Active Conditions');
  const modal = modalTitle.closest('.modal-content');
  expect(within(modal).getByText('Rage')).toBeInTheDocument();
  expect(within(modal).getByText('Reckless Attack')).toBeInTheDocument();
  expect(within(modal).getByText('Poisoned')).toBeInTheDocument();
  expect(within(modal).getAllByText('Rage')).toHaveLength(1);

  await userEvent.click(within(modal).getByRole('button', { name: /close/i }));
  await waitFor(() => expect(screen.queryByText('Active Conditions')).not.toBeInTheDocument());
});


test('Reckless Attack resource uses generic multi-line display label without Off/∞ value', async () => {
  apiFetch.mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('/characters/1')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          _id: '1',
          characterName: 'Hero',
          campaign: 'test-campaign',
          health: 20,
          currentHp: 20,
          str: 16,
          dex: 10,
          con: 10,
          occupation: [{ Name: 'Barbarian', Level: 3 }],
          conditions: [],
          classState: { barbarian: { rage: { active: false, current: 1 }, recklessAttack: { active: false } } },
          feat: [],
          equipment: {},
        }),
      });
    }
    return defaultApiFetchImplementation(url);
  });

  render(<ZombiesCharacterSheet />);

  const recklessTile = await screen.findByRole('button', { name: /reckless attack/i });
  expect(within(recklessTile).getByText('Reckless')).toBeInTheDocument();
  expect(within(recklessTile).getByText('Attack')).toBeInTheDocument();
  expect(within(recklessTile).queryByText('Off/∞')).not.toBeInTheDocument();
  expect(within(recklessTile).queryByText(/Off/)).not.toBeInTheDocument();
  expect(within(recklessTile).getByText('Reckless').className).toContain('combat-hud-resource-tile__name-line');

  const rageTile = screen.getByRole('button', { name: /rage/i });
  expect(within(rageTile).getByText('Rage')).toBeInTheDocument();
  expect(within(rageTile).getByText('1/3')).toBeInTheDocument();
});

test('active conditions sparkle supports keyboard activation', async () => {
  apiFetch.mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('/characters/1')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          _id: '1',
          characterName: 'Hero',
          campaign: 'test-campaign',
          health: 20,
          currentHp: 20,
          occupation: [],
          conditions: [{ id: 'frightened', name: 'Frightened', icon: '😨' }],
          feat: [],
          equipment: {},
        }),
      });
    }
    return defaultApiFetchImplementation(url);
  });

  render(<ZombiesCharacterSheet />);

  const trigger = await screen.findByRole('button', { name: /view active conditions/i });
  trigger.focus();
  await userEvent.keyboard('{Enter}');

  const modalTitle = await screen.findByText('Active Conditions');
  const modal = modalTitle.closest('.modal-content');
  expect(within(modal).getByText('Frightened')).toBeInTheDocument();
});

const { rollDiceWithBox } = require('../../../utils/diceBoxManager');

const getFooterButtonByLabel = (label) =>
  screen.findByRole('button', { name: label, hidden: true }, { timeout: 5000 });

const clickFooterButtonByLabel = async (label) => {
  const button = await getFooterButtonByLabel(label);
  await act(async () => {
    await userEvent.click(button);
  });
  return button;
};

const defaultApiFetchImplementation = (url) => {
  if (typeof url === 'string' && url.includes('/maps')) {
    return Promise.resolve({ ok: false, status: 404 });
  }

  if (typeof url === 'string' && url.includes('/map')) {
    return Promise.resolve({ ok: false, status: 404 });
  }

  if (typeof url === 'string' && url.includes('/classes/')) {
    return Promise.resolve({ ok: true, json: async () => ({ spellsKnown: 0 }) });
  }

  if (typeof url === 'string' && url.includes('/combat')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ participants: [], activeTurn: null }),
    });
  }

  if (typeof url === 'string' && url.includes('/characters')) {
    return Promise.resolve({ ok: true, json: async () => [] });
  }

  if (typeof url === 'string' && url.includes('/enemies')) {
    return Promise.resolve({ ok: true, json: async () => [] });
  }

  if (typeof url === 'string' && url.includes('token-folders')) {
    return Promise.resolve({ ok: true, json: async () => [] });
  }

  return Promise.reject(new Error(`Unexpected apiFetch call: ${url}`));
};

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(defaultApiFetchImplementation);
  mockSocketIo.mockReset();
  socketStub = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  mockSocketIo.mockReturnValue(socketStub);
  mockUpdateDamage.mockClear();
  mockCalcDamage.mockClear();
  mockOpenAttack.mockClear();
  mockOpenDice.mockClear();
  rollDiceWithBox.mockReset();
  rollDiceWithBox.mockImplementation((requests = []) =>
    Promise.resolve({
      rolls: Array.isArray(requests)
        ? requests.map(({ count }) => Array(count).fill(1))
        : [],
    })
  );
  mockOnCastSpell.current = null;
  mockHandleClose.current = null;
  mockShopModalProps.current = null;
  mockInventoryModalProps.current = null;
  mockDockedInventoryModalProps.current = null;
  mockEquipmentModalProps.current = null;
  mockMapModalProps.current = null;
  mockFeaturesModalProps.current = null;
  mockSkillsModalProps.current = null;
  mockDockedSkillsModalProps.current = null;
  mockCharacterInfoProps.current = null;
  window.localStorage.clear();
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});

test('uses character-derived hit points for synced combat participants', async () => {
  const characterResponse = {
    _id: '1',
    characterName: 'Hero',
    campaign: 'test-campaign',
    health: 30,
    currentHp: 12,
    occupation: [],
    feat: [],
    equipment: {},
  };

  apiFetch.mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('/characters/1')) {
      return Promise.resolve({
        ok: true,
        json: async () => characterResponse,
      });
    }

    if (typeof url === 'string' && url.includes('/campaigns/test-campaign/combat')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          participants: [
            {
              characterId: '1',
              initiative: 15,
              currentHp: 5,
              maxHp: 40,
            },
            {
              characterId: 'npc-1',
              displayName: 'Goblin',
              currentHp: 4,
              maxHp: 10,
              initiative: 10,
            },
          ],
          activeTurn: 0,
        }),
      });
    }

    if (typeof url === 'string' && url.includes('/campaigns/test-campaign/characters')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }

    if (typeof url === 'string' && url.includes('/campaigns/test-campaign/enemies')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }

    if (typeof url === 'string' && url.includes('/campaigns/test-campaign/maps')) {
      return Promise.resolve({ ok: false, status: 404 });
    }

    if (typeof url === 'string' && url.includes('/campaigns/test-campaign/map')) {
      return Promise.resolve({ ok: false, status: 404 });
    }

    return defaultApiFetchImplementation(url);
  });

  render(<ZombiesCharacterSheet />);

  await screen.findAllByText('Hero');
  await screen.findByText('Goblin');

  expect(screen.getAllByText('12/30').length).toBeGreaterThan(0);
  expect(screen.getAllByText('4/10').length).toBeGreaterThan(0);
  expect(screen.queryByText('5/40')).not.toBeInTheDocument();

});

test('spells button includes points-glow when spell points available', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 1,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const spellButton = await getFooterButtonByLabel(/open spells/i);
  await waitFor(() => expect(spellButton).toHaveClass('points-glow'));
});

test('reapplies Large Form bonuses after persisted effects and refetch', async () => {
  window.localStorage.clear();
  window.localStorage.setItem(
    'zombiesActiveEffects:1',
    JSON.stringify([{ name: 'Large Form' }])
  );

  const baseCharacter = {
    _id: 'character-1',
    occupation: [],
    spells: [],
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    campaign: null,
  };

  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => baseCharacter,
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => baseCharacter,
    });

  const { rerender } = render(<ZombiesCharacterSheet key="initial" />);

  await waitFor(() =>
    expect(mockEquipmentModalProps.current?.form?.temporarySize).toBe('Large')
  );
  expect(mockEquipmentModalProps.current?.form?.temporarySpeedBonus).toBe(10);

  await act(async () => {
    rerender(<ZombiesCharacterSheet key="refetched" />);
  });

  await waitFor(() =>
    expect(mockEquipmentModalProps.current?.form?.temporarySize).toBe('Large')
  );
  expect(mockEquipmentModalProps.current?.form?.temporarySpeedBonus).toBe(10);

  window.localStorage.removeItem('zombiesActiveEffects:1');
  window.localStorage.clear();
});

test('activating Draconic Flight adds a persistent effect without duplicates', async () => {
  window.localStorage.clear();

  const baseCharacter = {
    _id: 'character-1',
    occupation: [],
    spells: [],
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    campaign: null,
    race: { name: 'Dragonborn' },
  };

  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => baseCharacter,
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => baseCharacter,
    });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => {
    expect(mockFeaturesModalProps.current).not.toBeNull();
  });

  expect(mockFeaturesModalProps.current?.characterId).toBe('1');

  expect(typeof mockFeaturesModalProps.current.onDraconicFlight).toBe('function');

  await act(async () => {
    mockFeaturesModalProps.current.onDraconicFlight();
  });

  await waitFor(() => {
    const stored = window.localStorage.getItem('zombiesActiveEffects:1');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed).toEqual([
      { name: 'Draconic Flight', icon: dragonWingsIcon },
    ]);
  });

  await act(async () => {
    mockFeaturesModalProps.current.onDraconicFlight();
  });

  await waitFor(() => {
    const stored = window.localStorage.getItem('zombiesActiveEffects:1');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed).toEqual([
      { name: 'Draconic Flight', icon: dragonWingsIcon },
    ]);
  });

  window.localStorage.removeItem('zombiesActiveEffects:1');
  window.localStorage.clear();
});

test('adrenaline rush consumes a bonus action, persists once, grants temp HP, and resets on rest', async () => {
  window.localStorage.clear();

  const baseCharacter = {
    _id: 'character-1',
    occupation: [{ Name: 'Fighter', Level: 7 }],
    spells: [],
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    campaign: null,
    race: { name: 'Orc' },
    proficiencyBonus: 4,
    tempHealth: 1,
  };

  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => baseCharacter,
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => baseCharacter,
    });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => {
    expect(mockFeaturesModalProps.current).not.toBeNull();
  });

  expect(typeof mockFeaturesModalProps.current.onAdrenalineRush).toBe('function');

  const initialTempHealth = Number(
    mockFeaturesModalProps.current?.form?.tempHealth
  );

  await act(async () => {
    mockFeaturesModalProps.current.onAdrenalineRush();
  });

  await waitFor(() => {
    const stored = window.localStorage.getItem('zombiesActiveEffects:1');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed).toEqual([
      { name: 'Adrenaline Rush', icon: adrenalineRushIcon },
    ]);
  });

  await waitFor(() => {
    const slots = window.localStorage.getItem('zombiesUsedSlots:1');
    expect(slots).toBeTruthy();
    const parsed = JSON.parse(slots);
    expect(parsed).toEqual({ bonus: { 0: 'used' } });
  });

  await waitFor(() => {
    expect(mockFeaturesModalProps.current?.form?.tempHealth).toBe(
      Number.isFinite(initialTempHealth) ? initialTempHealth + 4 : 4
    );
  });


  await waitFor(() => {
    const stored = window.localStorage.getItem('zombiesActiveEffects:1');
    const parsed = stored ? JSON.parse(stored) : [];
    expect(parsed).toEqual([
      { name: 'Adrenaline Rush', icon: adrenalineRushIcon },
    ]);
  });

  await waitFor(() => {
    expect(mockCharacterInfoProps.current).not.toBeNull();
  });

  await act(async () => {
    mockCharacterInfoProps.current.onShortRest();
  });

  await waitFor(() => {
    expect(window.localStorage.getItem('zombiesActiveEffects:1')).toBeNull();
  });

  await waitFor(() => {
    expect(mockFeaturesModalProps.current?.form?.tempHealth).toBe(0);
  });


  window.localStorage.clear();
});

test('spells button glows when spellPoints absent but spells remain', async () => {
  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        occupation: [{ Name: 'Wizard', Level: 1 }],
        spells: [],
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        startStatTotal: 60,
        proficiencyPoints: 0,
        skills: {},
        item: [{ itemName: 'Legacy Keepsake' }],
        feat: [],
        weapon: [],
        armor: [],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ spellsKnown: 1 }),
    });

  render(<ZombiesCharacterSheet />);
  const spellButton = await getFooterButtonByLabel(/open spells/i);
  await waitFor(() => expect(spellButton).toHaveClass('points-glow'));
});

test('warlock character renders spells button', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Warlock', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const spellButton = await getFooterButtonByLabel(/open spells/i);
  expect(spellButton).toBeInTheDocument();
});

test('modal docking controls update docking state', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      expertisePoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => {
    expect(mockEquipmentModalProps.current).not.toBeNull();
  });

  expect(mockSkillsModalProps.current).not.toBeNull();
  expect(typeof mockSkillsModalProps.current.onDockChange).toBe('function');

  act(() => {
    mockSkillsModalProps.current.onDockChange?.('left');
  });

  await waitFor(() => {
    expect(mockDockedSkillsModalProps.current).not.toBeNull();
    if (mockDockedSkillsModalProps.current) {
      expect(mockDockedSkillsModalProps.current.isDocked).toBe(true);
      expect(mockDockedSkillsModalProps.current.dockedSide).toBe('left');
    }
    expect(mockSkillsModalProps.current.dockedSide).toBe('left');
  });

  act(() => {
    mockDockedSkillsModalProps.current?.onDockChange?.('right');
  });

  await waitFor(() => {
    expect(mockDockedSkillsModalProps.current).not.toBeNull();
    if (mockDockedSkillsModalProps.current) {
      expect(mockDockedSkillsModalProps.current.dockedSide).toBe('right');
    }
    expect(mockSkillsModalProps.current.dockedSide).toBe('right');
  });

  act(() => {
    mockDockedSkillsModalProps.current?.onDockClose?.();
  });

  await waitFor(() => {
    expect(mockSkillsModalProps.current.dockedSide).toBeNull();
  });

  expect(typeof mockMapModalProps.current?.onDockChange).toBe('function');

  act(() => {
    mockMapModalProps.current?.onDockChange?.('right');
  });

  await waitFor(() => {
    expect(mockMapModalProps.current).not.toBeNull();
    if (mockMapModalProps.current && typeof mockMapModalProps.current.isDocked !== 'undefined') {
      expect(mockMapModalProps.current.isDocked).toBe(true);
      expect(mockMapModalProps.current.dockedSide).toBe('right');
    }
    expect(mockMapModalProps.current?.onDockChange).toEqual(expect.any(Function));
  });

  act(() => {
    mockMapModalProps.current?.onDockClose?.();
  });

  await waitFor(() => {
    expect(mockMapModalProps.current).not.toBeNull();
    if (mockMapModalProps.current && typeof mockMapModalProps.current.isDocked !== 'undefined') {
      expect(mockMapModalProps.current.isDocked).toBe(false);
    }
    expect(mockMapModalProps.current?.onDockChange).toEqual(expect.any(Function));
  });
});

test('docked inventory modal retains item change handler', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      expertisePoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => {
    expect(mockInventoryModalProps.current).not.toBeNull();
  });

  const initialHandler = mockInventoryModalProps.current?.onItemsChange;
  expect(typeof initialHandler).toBe('function');

  act(() => {
    mockInventoryModalProps.current?.onDockChange?.('left');
  });

  await waitFor(() => {
    expect(mockDockedInventoryModalProps.current).not.toBeNull();
    if (mockDockedInventoryModalProps.current) {
      expect(mockDockedInventoryModalProps.current.isDocked).toBe(true);
      expect(mockDockedInventoryModalProps.current.dockedSide).toBe('left');
      expect(mockDockedInventoryModalProps.current.onItemsChange).toBe(initialHandler);
    }
  });
});

test('footer renders equipment button after spells button for spellcasters', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await screen.findByRole('button', { name: /open character info/i });
  await screen.findAllByRole('navigation');
  const nav = screen.getAllByRole('navigation').find((element) => element.classList.contains('combat-hud-dock')) || screen.getAllByRole('navigation')[0];
  const navButtons = within(nav).getAllByRole('button', { hidden: true });
  const indexOf = (pattern) =>
    navButtons.findIndex((btn) =>
      pattern.test(btn.getAttribute('aria-label') || '')
    );

  expect(indexOf(/open spells/i)).toBeGreaterThan(-1);
  expect(indexOf(/open equipment/i)).toBeGreaterThan(-1);
  expect(indexOf(/open inventory/i)).toBeGreaterThan(-1);
  expect(indexOf(/open spells/i)).toBeLessThan(indexOf(/open equipment/i));
  expect(indexOf(/open equipment/i)).toBeLessThan(indexOf(/open inventory/i));
});

test('footer renders equipment button before inventory for non-spellcasters', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Fighter', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await screen.findByRole('button', { name: /open character info/i });
  await screen.findAllByRole('navigation');
  const nav = screen.getAllByRole('navigation').find((element) => element.classList.contains('combat-hud-dock')) || screen.getAllByRole('navigation')[0];
  const navButtons = within(nav).getAllByRole('button', { hidden: true });
  const indexOf = (pattern) =>
    navButtons.findIndex((btn) =>
      pattern.test(btn.getAttribute('aria-label') || '')
    );

  expect(indexOf(/open spells/i)).toBe(-1);
  expect(indexOf(/open equipment/i)).toBeGreaterThan(-1);
  expect(indexOf(/open inventory/i)).toBeGreaterThan(-1);
  expect(indexOf(/open equipment/i)).toBeLessThan(indexOf(/open inventory/i));
});

test('campaign map background is active without footer toggle', async () => {
  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        occupation: [],
        spells: [],
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        startStatTotal: 60,
        proficiencyPoints: 0,
        skills: {},
        item: [],
        feat: [],
        weapon: [],
        armor: [],
        campaign: 'The Wilds',
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ participants: [], activeTurn: null }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        maps: [
          {
            mapId: 'wilds-map',
            title: 'Wilds Overview',
            imageUrl: 'https://example.com/wilds-map.png',
            altText: 'Wilds overview map',
          },
        ],
        activeMapId: 'wilds-map',
      }),
    });

  render(<ZombiesCharacterSheet />);

  await screen.findByRole('button', { name: /open character info/i });
  const mapButton = screen.queryByRole('button', {
    name: /open map/i,
    hidden: true,
  });
  expect(mapButton).toBeNull();

  await waitFor(() => expect(mockMapModalProps.current).not.toBeNull());
  await waitFor(() => expect(mockMapModalProps.current.show).toBe(true));
  expect(mockMapModalProps.current.map).toMatchObject({
    mapId: 'wilds-map',
    title: 'Wilds Overview',
    imageUrl: 'https://example.com/wilds-map.png',
  });
  expect(mockMapModalProps.current.maps).toHaveLength(1);
  expect(mockMapModalProps.current.activeMapId).toBe('wilds-map');
});

test('campaign map update events synchronize active map and list', async () => {
  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        occupation: [],
        spells: [],
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        startStatTotal: 60,
        proficiencyPoints: 0,
        skills: {},
        item: [],
        feat: [],
        weapon: [],
        armor: [],
        campaign: 'The Wilds',
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ participants: [], activeTurn: null }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        maps: [
          {
            mapId: 'old-map',
            title: 'Old Map',
            imageUrl: 'https://example.com/old-map.png',
          },
        ],
        activeMapId: 'old-map',
      }),
    });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockMapModalProps.current?.map?.mapId).toBe('old-map'));
  await waitFor(() =>
    expect(socketStub.on).toHaveBeenCalledWith(
      'campaign:map:update',
      expect.any(Function)
    )
  );

  const mapUpdateCall = socketStub.on.mock.calls.find(
    ([eventName]) => eventName === 'campaign:map:update'
  );
  expect(mapUpdateCall).toBeTruthy();
  const [, mapUpdateHandler] = mapUpdateCall;
  expect(typeof mapUpdateHandler).toBe('function');

  act(() => {
    mapUpdateHandler({
      maps: [
        {
          mapId: 'old-map',
          title: 'Old Map',
          imageUrl: 'https://example.com/old-map.png',
        },
        {
          mapId: 'new-map',
          title: 'New Map',
          imageUrl: 'https://example.com/new-map.png',
        },
      ],
      activeMapId: 'new-map',
    });
  });

  await waitFor(() => {
    expect(mockMapModalProps.current.map).toBeTruthy();
    expect(mockMapModalProps.current.map).toMatchObject({
      mapId: 'new-map',
      title: 'New Map',
    });
  });
  expect(mockMapModalProps.current.activeMapId).toBe('new-map');
  expect(mockMapModalProps.current.maps).toHaveLength(2);
});

test('renders SpellSlots for non-spellcasting characters', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Fighter', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  const { container } = render(<ZombiesCharacterSheet />);
  await waitFor(() =>
    expect(container.querySelector('.spell-slot-container')).toBeInTheDocument()
  );
});

test('persists used spell slots and actions to localStorage', async () => {
  window.localStorage.clear();

  const baseCharacter = {
    _id: 'character-1',
    occupation: [{ Name: 'Wizard', Level: 1 }],
    spells: [],
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
  };

  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => baseCharacter,
  });

  const user =
    typeof userEvent.setup === 'function' ? userEvent.setup() : userEvent;
  const { container, unmount } = render(<ZombiesCharacterSheet />);

  await waitFor(() =>
    expect(container.querySelector('.spell-slot-container')).toBeInTheDocument()
  );

  const actionCircle = container.querySelector('.action-slot .action-circle');
  expect(actionCircle).toBeInTheDocument();
  await user.click(actionCircle);
  await waitFor(() => expect(actionCircle).toHaveClass('slot-used'));

  const regularSlot = container.querySelector(
    '[data-slot-type="regular"][data-slot-level="1"] .slot-small'
  );
  expect(regularSlot).toBeInTheDocument();
  await user.click(regularSlot);
  await waitFor(() => expect(regularSlot).toHaveClass('slot-used'));

  const storageKey = 'zombiesUsedSlots:1';
  await waitFor(() => {
    const stored = window.localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed).toMatchObject({
      action: { 0: 'used' },
      'regular-1': { 0: true },
    });
  });

  unmount();

  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => baseCharacter,
  });

  const { container: rehydratedContainer } = render(
    <ZombiesCharacterSheet key="rehydrated" />
  );

  await waitFor(() =>
    expect(
      rehydratedContainer.querySelector('.spell-slot-container')
    ).toBeInTheDocument()
  );

  await waitFor(() => {
    const rehydratedAction = rehydratedContainer.querySelector(
      '.action-slot .action-circle'
    );
    expect(rehydratedAction).toHaveClass('slot-used');
  });

  await waitFor(() => {
    const rehydratedRegular = rehydratedContainer.querySelector(
      '[data-slot-type="regular"][data-slot-level="1"] .slot-small'
    );
    expect(rehydratedRegular).toHaveClass('slot-used');
  });

  window.localStorage.clear();
});

test('skills button includes points-glow when skill points available', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Fighter', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 1,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const skillButton = await getFooterButtonByLabel(/open skills/i);
  await waitFor(() => expect(skillButton).toHaveClass('points-glow'));
});

test('skills button includes points-glow when expertise points available', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Fighter', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      expertisePoints: 1,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const skillButton = await getFooterButtonByLabel(/open skills/i);
  await waitFor(() => expect(skillButton).toHaveClass('points-glow'));
});

test('skills button does not glow when granted proficiencies meet totals', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Rogue', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 2,
      expertisePoints: 1,
      skills: {
        stealth: { proficient: true, expertise: true },
        perception: { proficient: true },
      },
      race: {
        skills: {
          stealth: { proficient: true, expertise: true },
          perception: { proficient: true },
        },
      },
      background: {
        skills: {
          stealth: { expertise: true },
          perception: { proficient: true },
        },
      },
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const skillButton = await getFooterButtonByLabel(/open skills/i);
  await waitFor(() => expect(skillButton).not.toHaveClass('points-glow'));
});

test('casting spells consumes action and bonus circles based on casting time', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  const { container } = render(<ZombiesCharacterSheet />);

  let spellButton = await clickFooterButtonByLabel(/open spells/i);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();

  const actionCircle = container.querySelector('.action-circle');
  const bonusCircle = container.querySelector('.bonus-circle');

  mockOnCastSpell.current({ level: 1, castingTime: '1 action' });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());
  expect(actionCircle).toHaveClass('slot-used');
  expect(bonusCircle).toHaveClass('slot-active');

  spellButton = await clickFooterButtonByLabel(/open spells/i);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();
  mockOnCastSpell.current({ level: 1, castingTime: '1 bonus action' });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());
  expect(actionCircle).toHaveClass('slot-used');
  expect(bonusCircle).toHaveClass('slot-used');
});

test('casting Haste adds status icon and extra action circle', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });
  const { container } = render(<ZombiesCharacterSheet />);
  await waitFor(() => expect(container.querySelector('.action-circle')).toBeTruthy());
  expect(container.querySelectorAll('.action-circle').length).toBe(1);
  act(() => {
    mockOnCastSpell.current?.({
      name: 'Haste',
      level: 3,
      castingTime: '1 action',
    });
  });
  await waitFor(() =>
    expect(container.querySelectorAll('.action-circle').length).toBe(2)
  );
  const icon = screen.getByAltText('Haste');
  expect(icon).toHaveAttribute('src', hasteIcon);
});

test('using Potion of Speed grants Haste effect and extra action circle', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });
  const { container } = render(<ZombiesCharacterSheet />);
  await waitFor(() => expect(container.querySelector('.action-circle')).toBeTruthy());
  expect(container.querySelectorAll('.action-circle').length).toBe(1);

  await act(async () => {
    window.dispatchEvent(
      new CustomEvent('inventory:consumable-used', {
        detail: {
          type: 'potion',
          item: { name: 'potion-speed', displayName: 'Potion of Speed' },
        },
      })
    );
  });

  await waitFor(() =>
    expect(container.querySelectorAll('.action-circle').length).toBe(2)
  );
  const icon = screen.getByAltText('Haste');
  expect(icon).toHaveAttribute('src', hasteIcon);
});

test('using Potion of Growth grants Large Form effect and bonuses', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockEquipmentModalProps.current).not.toBeNull());
  expect(mockEquipmentModalProps.current?.form?.temporarySize).toBeUndefined();
  expect(mockEquipmentModalProps.current?.form?.temporarySpeedBonus).toBeUndefined();

  await act(async () => {
    window.dispatchEvent(
      new CustomEvent('inventory:consumable-used', {
        detail: {
          type: 'potion',
          item: { name: 'potion-growth', displayName: 'Potion of Growth' },
        },
      })
    );
  });

  await waitFor(() =>
    expect(mockEquipmentModalProps.current?.form?.temporarySize).toBe('Large')
  );
  expect(mockEquipmentModalProps.current?.form?.temporarySpeedBonus).toBe(10);

  const icon = await screen.findByAltText('Large Form');
  expect(icon).toHaveAttribute('src', largeFormIcon);
});

test('casting Speak with Animals adds status icon for free and slot casts', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });
  const { unmount } = render(<ZombiesCharacterSheet />);
  await waitFor(() =>
    expect(mockFeaturesModalProps.current?.onCastSpell).toBeTruthy()
  );
  act(() => {
    mockFeaturesModalProps.current?.onCastSpell?.({
      castingTime: '1 action',
      name: 'Speak with Animals',
      pendingEffectOnly: true,
    });
    mockFeaturesModalProps.current?.onCastSpell?.('action');
  });
  let icon = await screen.findByAltText('Speak with Animals');
  expect(icon).toHaveAttribute('src', speakWithAnimalsIcon);
  expect(screen.getAllByAltText('Speak with Animals')).toHaveLength(1);

  unmount();
  mockFeaturesModalProps.current = null;

  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await waitFor(() =>
    expect(mockFeaturesModalProps.current?.onCastSpell).toBeTruthy()
  );

  act(() => {
    mockFeaturesModalProps.current?.onCastSpell?.({
      name: 'Speak with Animals',
      level: 1,
      castingTime: '1 action',
    });
  });

  icon = await screen.findByAltText('Speak with Animals');
  expect(icon).toHaveAttribute('src', speakWithAnimalsIcon);
  expect(screen.getAllByAltText('Speak with Animals')).toHaveLength(1);
});

test('feats button includes points-glow when feat points available', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Fighter', Level: 4 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const featButton = await getFooterButtonByLabel(/open feats/i);
  await waitFor(() => expect(featButton).toHaveClass('points-glow'));
});

test('all footer buttons have footer-btn class', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const buttons = await screen.findAllByRole('button', { hidden: true });
  const footerButtons = buttons.filter((btn) => btn.classList.contains('footer-btn'));
  expect(footerButtons.length).toBeGreaterThan(0);
  footerButtons.forEach((btn) => expect(btn).toHaveClass('footer-btn'));
});

test('attack footer button triggers attack modal', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  const attackButton = await getFooterButtonByLabel(/open attack actions/i);

  await act(async () => {
    await userEvent.click(attackButton);
  });

  expect(mockOpenAttack).toHaveBeenCalledTimes(1);
});

test('dice footer button opens dice roller', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await screen.findByRole('button', { name: /open character info/i });
  await clickFooterButtonByLabel(/open dice roller/i);

  expect(mockOpenDice).toHaveBeenCalledTimes(1);
});

test('shop button opens ShopModal with default tab and retains previous tab', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Fighter', Level: 1 }],
      spells: [],
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await waitFor(() => expect(mockShopModalProps.current).not.toBeNull());

  const shopButton = await getFooterButtonByLabel(/open shop/i);
  expect(shopButton).toBeTruthy();

  await act(async () => {
    await clickFooterButtonByLabel(/open shop/i);
  });
  await waitFor(() =>
    expect(mockShopModalProps.current).toMatchObject({
      show: true,
      activeTab: 'weapons',
    })
  );

  act(() => {
    mockShopModalProps.current?.onTabChange?.('armor');
  });
  await waitFor(() =>
    expect(mockShopModalProps.current).toMatchObject({ activeTab: 'armor' })
  );

  act(() => {
    mockShopModalProps.current?.onHide?.();
  });
  await waitFor(() =>
    expect(mockShopModalProps.current).toMatchObject({ show: false })
  );

  await act(async () => {
    await clickFooterButtonByLabel(/open shop/i);
  });
  await waitFor(() =>
    expect(mockShopModalProps.current).toMatchObject({
      show: true,
      activeTab: 'armor',
    })
  );
});

test('purchasing from shop updates currency and inventory', async () => {
  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        occupation: [],
        spells: [],
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        startStatTotal: 60,
        proficiencyPoints: 0,
        skills: {},
        item: [{ itemName: 'Legacy Keepsake' }],
        feat: [],
        weapon: [],
        armor: [],
        cp: 200,
        sp: 0,
        gp: 0,
        pp: 0,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cp: 50, sp: 0, gp: 0, pp: 0 }),
    })
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Armor updated',
        warnings: [
          {
            type: 'strengthRequirement',
            name: 'Chain Mail',
            required: 13,
            actual: 10,
            slot: 'chest',
            message: 'Chain Mail requires strength 13 to equip.',
          },
        ],
      }),
    })
    .mockResolvedValueOnce({ ok: true });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockShopModalProps.current).not.toBeNull());
  await waitFor(() => expect(mockShopModalProps.current.form).toBeTruthy());
  await waitFor(() =>
    expect(mockShopModalProps.current.form.item).toEqual([
      { itemName: 'Legacy Keepsake' },
    ])
  );

  const cartItems = [
    {
      type: 'weapon',
      weaponType: 'martial',
      name: 'Longsword',
      category: 'martial melee weapon',
      damage: '1d8 slashing',
      properties: ['versatile'],
      weight: 3,
      cost: '1 gp',
    },
    {
      type: 'armor',
      armorType: 'heavy',
      name: 'Chain Mail',
      acBonus: 16,
      stealth: 'disadvantage',
      weight: 55,
      cost: '75 gp',
      strength: 13,
      slot: 'chest',
    },
    {
      type: 'item',
      itemType: 'gear',
      name: 'Torch',
      displayName: 'Torch',
      category: 'Adventuring Gear',
      weight: 1,
      cost: '3 sp',
      statBonuses: {},
      skillBonuses: {},
    },
  ];
  const totalCostCp = 150;

  await act(async () => {
    await mockShopModalProps.current.onPurchase(cartItems, totalCostCp);
  });

  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(5));

  expect(apiFetch).toHaveBeenNthCalledWith(
    2,
    '/characters/1/currency',
    expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
  );
  expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({ cp: -totalCostCp });

  expect(apiFetch).toHaveBeenNthCalledWith(
    3,
    '/equipment/update-weapon/1',
    expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
  );
  expect(JSON.parse(apiFetch.mock.calls[2][1].body)).toEqual({
    weapon: [
      expect.objectContaining({
        name: 'Longsword',
        cost: '1 gp',
        type: 'martial',
      }),
    ],
  });

  expect(apiFetch).toHaveBeenNthCalledWith(
    4,
    '/equipment/update-armor/1',
    expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
  );
  expect(JSON.parse(apiFetch.mock.calls[3][1].body)).toEqual({
    armor: [
      expect.objectContaining({
        name: 'Chain Mail',
        cost: '75 gp',
        type: 'heavy',
        slot: 'chest',
        strength: 13,
      }),
    ],
  });

  expect(apiFetch).toHaveBeenNthCalledWith(
    5,
    '/equipment/update-item/1',
    expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
  );
  const updatedItemsPayload = JSON.parse(apiFetch.mock.calls[4][1].body).item;
  expect(updatedItemsPayload).toHaveLength(2);
  expect(updatedItemsPayload[0]).toEqual(
    expect.objectContaining({
      name: 'Legacy Keepsake',
      displayName: 'Legacy Keepsake',
    })
  );
  expect(updatedItemsPayload[1]).toEqual(
    expect.objectContaining({
      name: 'Torch',
      cost: '3 sp',
      type: 'gear',
    })
  );

  await waitFor(() =>
    expect(mockShopModalProps.current.currency).toMatchObject({
      cp: 50,
      sp: 0,
      gp: 0,
      pp: 0,
    })
  );

  await waitFor(() =>
    expect(mockShopModalProps.current.form).toMatchObject({
      cp: 50,
      weapon: expect.arrayContaining([
        expect.objectContaining({ name: 'Longsword', type: 'martial' }),
      ]),
      armor: expect.arrayContaining([
        expect.objectContaining({
          name: 'Chain Mail',
          type: 'heavy',
          slot: 'chest',
        }),
      ]),
      item: expect.arrayContaining([
        expect.objectContaining({ name: 'Torch', type: 'gear' }),
      ]),
    })
  );
});

test('normalizes legacy inventory entries before updating items', async () => {
  const legacyArrayItem = [
    'Lantern',
    'Adventuring Gear',
    2,
    '5 sp',
    'Brass lantern',
    { wis: 1 },
    { perception: 2 },
  ];

  const initialItems = [
    'Rope (hempen)',
    legacyArrayItem,
    {
      name: 'Spyglass',
      category: 'Adventuring Gear',
      weight: ' 1 ',
      cost: '1,000 gp',
      notes: 'Expensive ',
      owned: false,
      displayName: 'Spyglass',
      rarity: 'rare',
      statBonuses: { wis: '2', str: 'not-a-number' },
      skillBonuses: { perception: '3', stealth: '' },
    },
  ];

  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        occupation: [],
        spells: [],
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        startStatTotal: 60,
        proficiencyPoints: 0,
        skills: {},
        item: initialItems,
        feat: [],
        weapon: [],
        armor: [],
        cp: 500,
        sp: 0,
        gp: 0,
        pp: 0,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cp: 450, sp: 0, gp: 0, pp: 0 }),
    })
    .mockResolvedValueOnce({ ok: true });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockShopModalProps.current).not.toBeNull());

  const newItem = {
    type: 'item',
    itemType: 'gear',
    name: 'Alchemy Jug',
    displayName: 'Alchemy Jug',
    category: 'Wondrous Item',
    weight: 12,
    cost: '5 gp',
    statBonuses: {},
    skillBonuses: {},
  };

  await act(async () => {
    await mockShopModalProps.current.onPurchase([newItem], 50);
  });

  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(3));

  const updateCall = apiFetch.mock.calls[2];
  expect(updateCall[0]).toBe('/equipment/update-item/1');
  expect(updateCall[1]).toEqual(
    expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const payload = JSON.parse(updateCall[1].body);
  expect(Array.isArray(payload.item)).toBe(true);
  expect(payload.item).toHaveLength(4);
  expect(
    payload.item.every(
      (entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
    )
  ).toBe(true);

  const rope = payload.item.find((entry) => entry.name === 'Rope (hempen)');
  expect(rope).toEqual({ name: 'Rope (hempen)' });

  const lantern = payload.item.find((entry) => entry.name === 'Lantern');
  expect(lantern).toMatchObject({
    category: 'Adventuring Gear',
    notes: 'Brass lantern',
    statBonuses: { wis: 1 },
    skillBonuses: { perception: 2 },
    weight: 2,
  });

  const newPurchase = payload.item.find((entry) => entry.name === 'Alchemy Jug');
  expect(newPurchase).toMatchObject({
    type: 'gear',
    owned: true,
  });

  const preserved = payload.item.find((entry) => entry.name === 'Spyglass');
  expect(preserved).toMatchObject({
    displayName: 'Spyglass',
    owned: false,
    rarity: 'rare',
    notes: 'Expensive',
    category: 'Adventuring Gear',
    weight: 1,
    statBonuses: { wis: 2 },
    skillBonuses: { perception: 3 },
  });
});

test('purchased equipment is marked owned and shown in inventory modal', async () => {
  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        occupation: [],
        spells: [],
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        startStatTotal: 60,
        proficiencyPoints: 0,
        skills: {},
        item: [],
        feat: [],
        weapon: [],
        armor: [],
        cp: 100,
        sp: 0,
        gp: 0,
        pp: 0,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cp: 90, sp: 0, gp: 0, pp: 0 }),
    })
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({ ok: true });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockShopModalProps.current).not.toBeNull());
  await waitFor(() => expect(mockInventoryModalProps.current).not.toBeNull());

  const weaponPurchase = {
    type: 'weapon',
    weaponType: 'martial',
    name: 'longsword',
    displayName: 'Longsword',
    damage: '1d8 slashing',
    properties: ['versatile'],
    cost: '15 gp',
    weight: 3,
  };

  const itemPurchase = {
    type: 'item',
    itemType: 'gear',
    name: 'rations',
    displayName: 'Rations (1 day)',
    category: 'adventuring gear',
    cost: '5 sp',
    weight: 2,
  };

  await act(async () => {
    await mockShopModalProps.current.onPurchase(
      [weaponPurchase, itemPurchase],
      10
    );
  });

  await waitFor(() => {
    expect(mockInventoryModalProps.current?.form?.weapon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayName: 'Longsword', owned: true }),
      ])
    );
    expect(mockInventoryModalProps.current?.form?.item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayName: 'Rations (1 day)', owned: true }),
      ])
    );
  });

  const inventoryButton = await getFooterButtonByLabel(/open inventory/i);
  expect(inventoryButton).toBeTruthy();

  await act(async () => {
    await clickFooterButtonByLabel(/open inventory/i);
  });

  await waitFor(() =>
    expect(mockInventoryModalProps.current).toMatchObject({ show: true })
  );
  expect(mockInventoryModalProps.current.form.weapon).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ displayName: 'Longsword', owned: true }),
    ])
  );
  expect(mockInventoryModalProps.current.form.item).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ displayName: 'Rations (1 day)', owned: true }),
    ])
  );
});

test('inventory button opens InventoryModal with default tab', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockInventoryModalProps.current).not.toBeNull());

  const inventoryButton = await getFooterButtonByLabel(/open inventory/i);
  expect(inventoryButton).toBeTruthy();

  await act(async () => {
    await clickFooterButtonByLabel(/open inventory/i);
  });

  await waitFor(() =>
    expect(mockInventoryModalProps.current).toMatchObject({
      show: true,
      activeTab: 'weapons',
    })
  );
});

test('equipment button opens and closes EquipmentModal independently', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
      equipment: {},
    }),
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockEquipmentModalProps.current).not.toBeNull());
  expect(mockEquipmentModalProps.current.show).toBe(false);

  const equipmentButton = await getFooterButtonByLabel(/open equipment/i);
  expect(equipmentButton).toBeTruthy();

  await act(async () => {
    await clickFooterButtonByLabel(/open equipment/i);
  });

  await waitFor(() =>
    expect(mockEquipmentModalProps.current).toMatchObject({ show: true })
  );
  expect(mockInventoryModalProps.current?.show).not.toBe(true);

  act(() => {
    mockEquipmentModalProps.current?.onHide?.();
  });

  await waitFor(() =>
    expect(mockEquipmentModalProps.current).toMatchObject({ show: false })
  );
});

test('equipment changes are normalized and persisted', async () => {
  const initialCharacter = {
    occupation: [],
    spells: [],
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    equipment: { mainHand: { name: 'Dagger', source: 'weapon' } },
  };

  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => initialCharacter,
    })
    .mockResolvedValueOnce({ ok: true });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockEquipmentModalProps.current).not.toBeNull());
  await waitFor(() =>
    expect(mockEquipmentModalProps.current?.form?.equipment).toBeDefined()
  );

  const equipmentPayload = {
    ...mockEquipmentModalProps.current.form.equipment,
    mainHand: null,
    offHand: { name: 'Shield', source: 'armor' },
  };

  await act(async () => {
    await mockEquipmentModalProps.current.onEquipmentChange(equipmentPayload);
  });

  expect(apiFetch).toHaveBeenLastCalledWith(
    '/equipment/update-equipment/1',
    expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const lastCallIndex = apiFetch.mock.calls.length - 1;
  const lastCall = apiFetch.mock.calls[lastCallIndex];
  const payload = JSON.parse(lastCall[1].body);
  expect(Object.keys(payload.equipment).sort()).toEqual(
    [...EQUIPMENT_SLOT_KEYS].sort()
  );
  expect(payload.equipment.mainHand).toBeNull();
  expect(payload.equipment.offHand).toMatchObject({
    name: 'Shield',
    source: 'armor',
  });

  await waitFor(() =>
    expect(mockEquipmentModalProps.current.form.equipment.offHand).toMatchObject({
      name: 'Shield',
      source: 'armor',
    })
  );
  EQUIPMENT_SLOT_KEYS.filter((slot) => slot !== 'offHand').forEach((slot) => {
    expect(mockEquipmentModalProps.current.form.equipment[slot]).toBeNull();
  });
});

test('strength override from inventory applies only when equipped', async () => {
  const initialCharacter = {
    occupation: [],
    spells: [],
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    equipment: {},
  };

  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => initialCharacter,
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockSkillsModalProps.current).not.toBeNull());
  await waitFor(() => expect(mockEquipmentModalProps.current).not.toBeNull());

  expect(mockSkillsModalProps.current.strMod).toBe(0);

  const strengthBelt = {
    type: 'item',
    name: 'Belt of Giant Strength',
    statOverrides: { str: 18 },
    owned: true,
  };

  apiFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cp: 0, sp: 0, gp: 0, pp: 0 }),
    })
    .mockResolvedValueOnce({ ok: true });

  await act(async () => {
    await mockShopModalProps.current.onPurchase([strengthBelt], 0);
  });

  await waitFor(() => expect(mockSkillsModalProps.current.strMod).toBe(0));

  const equipmentPayload = {
    ...mockEquipmentModalProps.current.form.equipment,
    waist: {
      name: 'Belt of Giant Strength',
      statOverrides: { str: 18 },
      source: 'item',
    },
  };

  apiFetch.mockResolvedValueOnce({ ok: true });

  await act(async () => {
    await mockEquipmentModalProps.current.onEquipmentChange(equipmentPayload);
  });

  await waitFor(() => expect(mockSkillsModalProps.current.strMod).toBe(4));
});

test('handleCastSpell closes modal and outputs spell name', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await clickFooterButtonByLabel(/open spells/i);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();
  mockOnCastSpell.current({ level: 1, name: 'Mage Hand' });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());
  expect(mockUpdateDamage).toHaveBeenCalledWith('Mage Hand', undefined, undefined);
});

test('handleCastSpell outputs calculated damage', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  render(<ZombiesCharacterSheet />);
  await clickFooterButtonByLabel(/open spells/i);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();
  mockOnCastSpell.current({ level: 1, damage: '1d4', name: 'Acid Splash' });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());
  expect(mockCalcDamage).toHaveBeenCalled();
  expect(
    mockCalcDamage.mock.calls.some((call) => call[0] === '1d4')
  ).toBe(true);
  expect(mockUpdateDamage).toHaveBeenCalled();
});

test('consumes higher-level slot when upcasting', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 3 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  const { container } = render(<ZombiesCharacterSheet />);

  // Open the spell selector so the mocked onCastSpell is set
  await clickFooterButtonByLabel(/open spells/i);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();

  const groupBefore = container.querySelector('[data-slot-type="regular"][data-slot-level="2"]');
  expect(groupBefore.querySelectorAll('.slot-used')).toHaveLength(0);

  mockOnCastSpell.current({ level: 2 });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());

  const groupAfter = container.querySelector('[data-slot-type="regular"][data-slot-level="2"]');
  expect(groupAfter.querySelectorAll('.slot-used')).toHaveLength(1);
});

test('pass-turn event resets action and bonus usage', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  const { container } = render(<ZombiesCharacterSheet />);
  await waitFor(() => expect(container.querySelector('.action-circle')).toBeTruthy());
  const action = container.querySelector('.action-circle');
  const bonus = container.querySelector('.bonus-circle');
  await act(async () => {
    fireEvent.click(action);
    fireEvent.click(bonus);
  });
  expect(action).toHaveClass('slot-used');
  expect(bonus).toHaveClass('slot-used');

  window.dispatchEvent(new Event('pass-turn'));

  await waitFor(() => {
    expect(action).toHaveClass('slot-active');
    expect(bonus).toHaveClass('slot-active');
  });
});

test('using a consumable potion consumes the bonus action circle', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  const { container } = render(<ZombiesCharacterSheet />);
  await waitFor(() => expect(container.querySelector('.bonus-circle')).toBeTruthy());
  const bonus = container.querySelector('.bonus-circle');
  expect(bonus).toHaveClass('slot-active');

  await act(async () => {
    window.dispatchEvent(
      new CustomEvent('inventory:consumable-used', {
        detail: { type: 'potion' },
      })
    );
  });

  await waitFor(() => {
    expect(bonus).toHaveClass('slot-used');
  });
});

test('action and bonus markers cycle through states', async () => {
  apiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      occupation: [{ Name: 'Wizard', Level: 1 }],
      spells: [],
      spellPoints: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      startStatTotal: 60,
      proficiencyPoints: 0,
      skills: {},
      item: [],
      feat: [],
      weapon: [],
      armor: [],
    }),
  });

  const { container } = render(<ZombiesCharacterSheet />);
  await waitFor(() => expect(container.querySelector('.action-circle')).toBeTruthy());
  const action = container.querySelector('.action-circle');
  const bonus = container.querySelector('.bonus-circle');

  fireEvent.click(action);
  expect(action).toHaveClass('slot-used');
  fireEvent.click(action);
  expect(action).toHaveClass('slot-active');
  fireEvent.click(action);
  expect(action).toHaveClass('slot-used');

  fireEvent.click(bonus);
  expect(bonus).toHaveClass('slot-used');
  fireEvent.click(bonus);
  expect(bonus).toHaveClass('slot-active');
  fireEvent.click(bonus);
  expect(bonus).toHaveClass('slot-used');
});

test('loads campaign map tokens and updates them after placement', async () => {
  const campaignId = 'camp-1';
  const mapId = 'map-1';
  const character = {
    _id: 'char-1',
    characterId: 'char-1',
    characterName: 'Hero',
    campaign: campaignId,
    occupation: [],
    feat: [],
    weapon: [],
    armor: [],
    item: [],
    accessories: [],
    diceColor: '#3366ff',
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
  };

  apiFetch.mockImplementation((url, options = {}) => {
    if (url === '/characters/1') {
      return Promise.resolve({ ok: true, json: async () => character });
    }

    if (url === `/campaigns/${campaignId}/combat`) {
      return Promise.resolve({ ok: true, json: async () => ({ participants: [] }) });
    }

    if (url === `/campaigns/${campaignId}/characters`) {
      return Promise.resolve({ ok: true, json: async () => [character] });
    }

    if (url === `/campaigns/${campaignId}/enemies`) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }

    if (url === `/campaigns/${campaignId}/maps`) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          maps: [
            {
              mapId,
              title: 'Dungeon',
              tokens: {
                'char-1': { characterId: 'char-1', x: 0.2, y: 0.4 },
              },
            },
          ],
          activeMapId: mapId,
          tokensByMapId: {
            [mapId]: {
              'char-1': { characterId: 'char-1', x: 0.2, y: 0.4 },
            },
          },
        }),
      });
    }

    if (url === `/campaigns/${campaignId}/maps/${mapId}/tokens/char-1` && options.method === 'PUT') {
      expect(JSON.parse(options.body)).toEqual({ x: 0.5, y: 0.6 });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }

    if (url === `/campaigns/${campaignId}/maps/${mapId}/tokens/char-1` && options.method === 'DELETE') {
      return Promise.resolve({ ok: true });
    }

    return Promise.reject(new Error(`Unexpected apiFetch call: ${url}`));
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockMapModalProps.current).not.toBeNull());

  await waitFor(() => {
    expect(mockMapModalProps.current.tokensByMapId).toMatchObject({
      'map-1': {
        'char-1': expect.objectContaining({ characterId: 'char-1', x: 0.2, y: 0.4 }),
      },
    });
  });
  expect(mockMapModalProps.current.currentCharacterId).toBe('char-1');
  expect(mockMapModalProps.current.characterLookup['char-1']).toMatchObject({
    color: '#3366ff',
    label: 'Hero',
  });

  await act(async () => {
    const result = await mockMapModalProps.current.onTokenMove({
      mapId,
      characterId: 'char-1',
      x: 0.5,
      y: 0.6,
    });
    expect(result).toBe(true);
  });

  await waitFor(() => {
    const updatedToken =
      mockMapModalProps.current.tokensByMapId?.[mapId]?.['char-1'];
    expect(updatedToken).toBeDefined();
    expect(updatedToken.x).toBeCloseTo(0.5);
    expect(updatedToken.y).toBeCloseTo(0.6);
  });

  apiFetch.mockClear();

  await act(async () => {
    const result = await mockMapModalProps.current.onTokenRemove({
      mapId,
      characterId: 'char-1',
    });
    expect(result).toBe(true);
  });

  await waitFor(() => {
    expect(apiFetch).toHaveBeenCalledWith(
      `/campaigns/${campaignId}/maps/${mapId}/tokens/char-1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  await waitFor(() => {
    const remainingToken =
      mockMapModalProps.current.tokensByMapId?.[mapId]?.['char-1'];
    expect(remainingToken).toBeUndefined();
  });
});

test('allows selecting a figurine token through the token picker modal', async () => {
  const campaignId = 'camp-figurines';
  const manifestAsset = {
    publicId: 'Tokens/Adventurers/Hero',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/v123/Tokens/Adventurers/Hero.png',
    filename: 'Hero Token',
    relativeFolder: 'Adventurers',
  };

  const manifestResponse = {
    assets: [manifestAsset],
    nextCursor: null,
    appliedFolders: ['Adventurers'],
  };

  const characterResponse = {
    _id: '1',
    characterId: '1',
    campaign: campaignId,
    characterName: 'Token Tester',
    occupation: [{ Name: 'Wizard', Level: 1 }],
    spells: [],
    spellPoints: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    accessories: [],
    equipment: {},
  };

  apiFetch.mockImplementation((url, options = {}) => {
    if (url === '/characters/1') {
      return Promise.resolve({ ok: true, json: async () => characterResponse });
    }

    if (url === `/campaigns/${campaignId}/combat`) {
      return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
    }

    if (url === `/campaigns/${campaignId}/characters`) {
      return Promise.resolve({ ok: true, json: async () => [characterResponse] });
    }

    if (url === `/campaigns/${campaignId}/maps`) {
      return Promise.resolve({ ok: false, status: 404 });
    }

    if (url === `/campaigns/${campaignId}/map`) {
      return Promise.resolve({ ok: false, status: 404 });
    }

    if (url === `/campaigns/${campaignId}/enemies`) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }

    if (typeof url === 'string' && url.startsWith(`/campaigns/${campaignId}/token-manifest`)) {
      return Promise.resolve({ ok: true, json: async () => manifestResponse });
    }

    if (url === '/characters/1/figurine') {
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body).toEqual({
        figurineImageUrl: manifestAsset.secureUrl,
        figurineImagePublicId: manifestAsset.publicId,
      });
      return Promise.resolve({ ok: true, json: async () => body });
    }

    if (typeof url === 'string' && url.includes('/classes/')) {
      return Promise.resolve({ ok: true, json: async () => ({ spellsKnown: 0 }) });
    }

    return defaultApiFetchImplementation(url, options);
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockCharacterInfoProps.current).not.toBeNull());

  await act(async () => {
    mockCharacterInfoProps.current.handleOpenTokenPicker();
  });

  await waitFor(() => {
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/campaigns/${campaignId}/token-manifest`)
    );
  });

  const heroTokenButton = await screen.findByRole('button', { name: /hero token/i });
  await userEvent.click(heroTokenButton);

  await waitFor(() => {
    expect(apiFetch).toHaveBeenCalledWith(
      '/characters/1/figurine',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  await waitFor(() => {
    expect(mockCharacterInfoProps.current?.characterFigurine?.figurineImageUrl).toBe(
      manifestAsset.secureUrl
    );
    expect(mockCharacterInfoProps.current?.characterFigurine?.figurineImagePublicId).toBe(
      manifestAsset.publicId
    );
  });
});

test('allows clearing an existing figurine selection from the token picker modal', async () => {
  const campaignId = 'camp-figurines';
  const existingFigurineUrl = 'https://res.cloudinary.com/demo/image/upload/v123/Tokens/Adventurers/Existing.png';

  const characterResponse = {
    _id: '1',
    characterId: '1',
    campaign: campaignId,
    characterName: 'Token Tester',
    occupation: [{ Name: 'Wizard', Level: 1 }],
    spells: [],
    spellPoints: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    startStatTotal: 60,
    proficiencyPoints: 0,
    skills: {},
    item: [],
    feat: [],
    weapon: [],
    armor: [],
    accessories: [],
    equipment: {},
    figurineImageUrl: existingFigurineUrl,
  };

  const campaignCharacterResponse = {
    ...characterResponse,
    figurineImageUrl: existingFigurineUrl,
  };

  const manifestResponse = {
    assets: [],
    nextCursor: null,
    appliedFolders: ['Adventurers'],
  };

  const figurineUpdateBodies = [];

  apiFetch.mockImplementation((url, options = {}) => {
    if (url === '/characters/1') {
      return Promise.resolve({ ok: true, json: async () => characterResponse });
    }

    if (url === `/campaigns/${campaignId}/combat`) {
      return Promise.resolve({ ok: true, json: async () => ({ participants: [], activeTurn: null }) });
    }

    if (url === `/campaigns/${campaignId}/characters`) {
      return Promise.resolve({ ok: true, json: async () => [campaignCharacterResponse] });
    }

    if (url === `/campaigns/${campaignId}/maps`) {
      return Promise.resolve({ ok: false, status: 404 });
    }

    if (url === `/campaigns/${campaignId}/map`) {
      return Promise.resolve({ ok: false, status: 404 });
    }

    if (url === `/campaigns/${campaignId}/enemies`) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }

    if (typeof url === 'string' && url.startsWith(`/campaigns/${campaignId}/token-manifest`)) {
      return Promise.resolve({ ok: true, json: async () => manifestResponse });
    }

    if (url === '/characters/1/figurine') {
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      figurineUpdateBodies.push(body);
      return Promise.resolve({ ok: true, json: async () => ({
        figurineImageUrl: body.figurineImageUrl,
        figurineImagePublicId: body.figurineImagePublicId,
      }) });
    }

    if (typeof url === 'string' && url.includes('/classes/')) {
      return Promise.resolve({ ok: true, json: async () => ({ spellsKnown: 0 }) });
    }

    return defaultApiFetchImplementation(url, options);
  });

  render(<ZombiesCharacterSheet />);

  await waitFor(() => expect(mockCharacterInfoProps.current).not.toBeNull());

  await waitFor(() => {
    expect(mockCharacterInfoProps.current?.characterFigurine?.figurineImageUrl).toBe(
      existingFigurineUrl
    );
  });

  await act(async () => {
    mockCharacterInfoProps.current.handleOpenTokenPicker();
  });

  const clearButton = await screen.findByRole('button', { name: /clear selection/i });
  await userEvent.click(clearButton);

  await waitFor(() => {
    expect(figurineUpdateBodies.length).toBeGreaterThan(0);
  });

  expect(figurineUpdateBodies[0]).toEqual({ figurineImageUrl: '', figurineImagePublicId: '' });

  await waitFor(() => {
    expect(mockCharacterInfoProps.current?.characterFigurine?.figurineImageUrl).toBeNull();
    expect(mockCharacterInfoProps.current?.characterFigurine?.figurineImagePublicId).toBeNull();
  });
});
