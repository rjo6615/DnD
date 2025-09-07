import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ZombiesCharacterSheet from './ZombiesCharacterSheet';

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
jest.mock('../attributes/PlayerTurnActions', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../Armor/ArmorList', () => () => null);
jest.mock('../attributes/Items', () => () => null);
jest.mock('../attributes/Help', () => () => null);
jest.mock('../attributes/BackgroundModal', () => () => null);
jest.mock('../attributes/Features', () => () => null);
jest.mock('../attributes/SpellSelector', () => () => null);
jest.mock('../attributes/HealthDefense', () => () => null);

beforeEach(() => {
  apiFetch.mockReset();
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
