import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import hasteIcon from '../../../images/spell-haste-icon.png';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

jest.mock('../attributes/CharacterInfo', () => () => null);
jest.mock('../attributes/Stats', () => () => null);
jest.mock('../attributes/Skills', () => () => null);
jest.mock('../attributes/Feats', () => () => null);
jest.mock('../../Weapons/WeaponList', () => () => null);
var mockUpdateDamage;
var mockCalcDamage;
jest.mock('../attributes/PlayerTurnActions', () => {
  const React = require('react');
  mockUpdateDamage = jest.fn();
  mockCalcDamage = jest.fn(() => ({ total: 7, breakdown: '' }));
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        updateDamageValueWithAnimation: mockUpdateDamage,
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
jest.mock('../attributes/Features', () => () => null);
const mockOnCastSpell = { current: null };
const mockHandleClose = { current: null };
jest.mock('../attributes/SpellSelector', () => (props) => {
  mockOnCastSpell.current = props.onCastSpell;
  mockHandleClose.current = props.handleClose;
  return props.show ? <div data-testid="spell-selector" /> : null;
});
jest.mock('../attributes/HealthDefense', () => () => null);

import ZombiesCharacterSheet from './ZombiesCharacterSheet';

beforeEach(() => {
  apiFetch.mockReset();
  mockUpdateDamage.mockClear();
  mockCalcDamage.mockClear();
  mockOnCastSpell.current = null;
  mockHandleClose.current = null;
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
  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));
  await waitFor(() => expect(spellButton).toHaveClass('points-glow'));
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
        item: [],
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
  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));
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
  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));
  expect(spellButton).toBeInTheDocument();
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
  const buttons = await screen.findAllByRole('button');
  const skillButton = buttons.find((btn) => btn.classList.contains('fa-book-open'));
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
  const buttons = await screen.findAllByRole('button');
  const skillButton = buttons.find((btn) => btn.classList.contains('fa-book-open'));
  await waitFor(() => expect(skillButton).toHaveClass('points-glow'));
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

  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));

  await userEvent.click(spellButton);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();

  const actionCircle = container.querySelector('.action-circle');
  const bonusCircle = container.querySelector('.bonus-circle');

  mockOnCastSpell.current({ level: 1, castingTime: '1 action' });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());
  expect(actionCircle).toHaveClass('slot-used');
  expect(bonusCircle).toHaveClass('slot-active');

  await userEvent.click(spellButton);
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
  const buttons = await screen.findAllByRole('button');
  const featButton = buttons.find((btn) => btn.classList.contains('fa-hand-fist'));
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
  const buttons = await screen.findAllByRole('button');
  const footerButtons = buttons.filter((btn) => btn.classList.contains('footer-btn'));
  expect(footerButtons.length).toBeGreaterThan(0);
  footerButtons.forEach((btn) => expect(btn).toHaveClass('footer-btn'));
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
  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));
  await userEvent.click(spellButton);
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
  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));
  await userEvent.click(spellButton);
  expect(await screen.findByTestId('spell-selector')).toBeInTheDocument();
  mockOnCastSpell.current({ level: 1, damage: '1d4', name: 'Acid Splash' });
  mockHandleClose.current();
  await waitFor(() => expect(screen.queryByTestId('spell-selector')).toBeNull());
  expect(mockCalcDamage).toHaveBeenCalledWith(
    '1d4',
    0,
    false,
    undefined,
    undefined,
    undefined
  );
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
  const buttons = await screen.findAllByRole('button');
  const spellButton = buttons.find((btn) => btn.classList.contains('fa-hat-wizard'));
  await userEvent.click(spellButton);
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
  fireEvent.click(action);
  fireEvent.click(bonus);
  expect(action).toHaveClass('slot-used');
  expect(bonus).toHaveClass('slot-used');

  window.dispatchEvent(new Event('pass-turn'));

  await waitFor(() => {
    expect(action).toHaveClass('slot-active');
    expect(bonus).toHaveClass('slot-active');
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
