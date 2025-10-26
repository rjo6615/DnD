import React from 'react';
import {
  render,
  act,
  fireEvent,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import PlayerTurnActions, * as PlayerTurnActionsModule from './PlayerTurnActions';

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
const { rollDiceWithBox } = require('../../../utils/diceBoxManager');
import damageTypeColors from '../../../utils/damageTypeColors';

const { calculateDamage } = PlayerTurnActionsModule;

async function getRollDamageButtonForCard(titleMatcher) {
  const titleNode = await screen.findByText(titleMatcher);
  const card = titleNode.closest('.attack-card');
  if (!card) {
    throw new Error('Attack card not found');
  }
  return within(card).getByLabelText(/Roll damage/i);
}

beforeEach(() => {
  rollDiceWithBox.mockClear();
  rollDiceWithBox.mockImplementation((requests = []) =>
    Promise.resolve({
      rolls: Array.isArray(requests)
        ? requests.map(({ count }) => Array(count).fill(1))
        : [],
    })
  );
});

describe('calculateDamage parser', () => {
  const fixedRoll = (count, sides) => Array(count).fill(1);

  test('handles 10d4', () => {
    expect(calculateDamage('10d4', 0, false, fixedRoll).total).toBe(10);
  });

  test('handles 10d4+1', () => {
    expect(calculateDamage('10d4+1', 0, false, fixedRoll).total).toBe(11);
  });

  test('handles 1d8 slashing', () => {
    expect(calculateDamage('1d8 slashing', 0, false, fixedRoll).total).toBe(1);
  });

  test('handles 2d6 fire', () => {
    expect(calculateDamage('2d6 fire', 0, false, fixedRoll).total).toBe(2);
  });

  test('handles flat damage 100', () => {
    expect(calculateDamage('100', 0, false, fixedRoll).total).toBe(100);
  });

  test('crit rolls extra dice but adds modifiers once', () => {
    let calls = 0;
    const critRoll = (count, sides) => {
      calls++;
      return Array(count).fill(1);
    };
    expect(calculateDamage('1d4+2', 4, true, critRoll).total).toBe(8);
    expect(calls).toBe(2);
  });

  test('flat damage ignores crit flag', () => {
    expect(calculateDamage('100', 0, true, fixedRoll).total).toBe(100);
  });

  test('adds extra dice for levels above', () => {
    const extra = { count: 1, sides: 4 };
    expect(calculateDamage('1d4', 0, false, fixedRoll, extra, 2).total).toBe(3);
  });

  test('doubles extra dice on a critical hit', () => {
    const extra = { count: 1, sides: 4 };
    expect(calculateDamage('1d4', 0, true, fixedRoll, extra, 2).total).toBe(6);
  });

  test('handles multi-type damage and returns breakdown string', () => {
    expect(
      calculateDamage('1d4 cold + 1d6 slashing', 2, false, fixedRoll)
    ).toMatchObject({
      total: 4,
      breakdown: '3 cold + 1 slashing',
      diceRolls: [
        { sides: 4, value: 1, type: 'cold', category: 'base' },
        { sides: 6, value: 1, type: 'slashing', category: 'base' },
      ],
    });
  });
});

describe('PlayerTurnActions weapon damage display', () => {
  test('pass button is disabled when canPassTurn is false', () => {
    const onPassTurn = jest.fn();
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, weapon: [], spells: [] }}
        strMod={0}
        dexMod={0}
        onPassTurn={onPassTurn}
        canPassTurn={false}
      />
    );
    const passButton = screen.getByRole('button', { name: /pass/i });
    expect(passButton).toBeDisabled();
    fireEvent.click(passButton);
    expect(onPassTurn).not.toHaveBeenCalled();
  });

  test('weapon damage segments include ability and type classes', async () => {
    const weapon = {
      name: 'Frost Brand',
      damage: '1d4 cold + 1d6 slashing',
      category: 'melee',
      source: 'weapon',
      type: 'martial melee weapon',
      properties: ['Finesse', 'Versatile (1d10)'],
    };
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          spells: [],
        }}
        strMod={2}
        atkBonus={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const card = screen.getByText('Frost Brand').closest('.attack-card');
    expect(card).not.toBeNull();
    expect(within(card).getByText('Weapon Type:')).toBeInTheDocument();
    expect(within(card).getByText('Martial Melee Weapon')).toBeInTheDocument();
    const cold = within(card).getByText('1d4+2 Cold');
    const slashing = within(card).getByText('1d6 Slashing');
    expect(cold).toHaveClass('damage-cold');
    expect(slashing).toHaveClass('damage-slashing');
    expect(slashing.textContent).toBe('1d6 Slashing');

    const propertiesRow = within(card)
      .getByText('Properties')
      .closest('.attack-card__row');
    expect(propertiesRow).not.toBeNull();
    expect(
      within(propertiesRow).getByText('Finesse, Versatile (1d10)')
    ).toBeInTheDocument();
    const propertiesButton = within(propertiesRow).getByRole('button', {
      name: /view weapon property descriptions/i,
    });
    await act(async () => {
      fireEvent.click(propertiesButton);
    });
    await waitFor(() => {
      expect(screen.getByText('Finesse')).toBeInTheDocument();
      expect(
        screen.getByText(
          /When making an attack with a finesse weapon, you use your choice/
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Versatile (1d10)')).toBeInTheDocument();
      expect(
        screen.getByText(
          /This weapon can be used with one or two hands\. A damage value in parentheses/
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Definition not available.')
      ).not.toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(document.body);
    });
  });

  test('infers weapon mastery from weapon type when not provided', async () => {
    const weapon = {
      name: 'Custom Warhammer',
      damage: '1d8 bludgeoning',
      category: 'martial melee weapon',
      source: 'weapon',
      type: 'warhammer',
    };

    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          spells: [],
        }}
        strMod={2}
        dexMod={0}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const card = screen.getByText('Custom Warhammer').closest('.attack-card');
    expect(card).not.toBeNull();
    if (!card) throw new Error('missing Custom Warhammer card');

    const masteryButton = within(card).getByLabelText(
      /View Push mastery description/i
    );
    expect(masteryButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(masteryButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Push')).toBeInTheDocument();
      expect(
        screen.getByText(/If you hit a creature with this weapon, you can push/i)
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(document.body);
    });
  });

  test('finesse ability selection updates attack bonus and damage modifier', async () => {
    const weapon = {
      name: 'Rapier',
      damage: '1d8 piercing',
      category: 'melee',
      source: 'weapon',
      properties: ['Finesse'],
    };
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          spells: [],
        }}
        strMod={5}
        dexMod={2}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const card = screen.getByText('Rapier').closest('.attack-card');
    expect(card).not.toBeNull();

    const attackRow = within(card).getByText('Attack Bonus').closest('.attack-card__row');
    const attackValue = attackRow.querySelector('.attack-card__value');
    expect(attackValue).not.toBeNull();
    expect(attackValue?.textContent).toBe(String(7));

    const damageRow = within(card).getByText('Damage').closest('.attack-card__row');
    expect(damageRow).not.toBeNull();
    expect(
      within(damageRow).getByText('1d8+5 Piercing')
    ).toBeInTheDocument();

    const abilitySelect = within(card).getByRole('combobox', {
      name: /select ability for rapier/i,
    });

    await act(async () => {
      fireEvent.change(abilitySelect, { target: { value: 'dex' } });
    });

    await waitFor(() => {
      expect(attackValue?.textContent).toBe(String(4));
      expect(
        within(damageRow).getByText('1d8+2 Piercing')
      ).toBeInTheDocument();
    });
  });

  test('monk uses dexterity for simple melee weapon attacks', () => {
    const weapon = {
      name: 'Quarterstaff',
      damage: '1d6 bludgeoning',
      category: 'Simple Melee Weapon',
      source: 'weapon',
      properties: [],
    };

    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          weapon: [],
          spells: [],
          occupation: [{ Name: 'Monk', Level: 2 }],
        }}
        strMod={5}
        dexMod={1}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const card = screen.getByText('Quarterstaff').closest('.attack-card');
    expect(card).not.toBeNull();
    if (!card) throw new Error('Quarterstaff card not found');

    const attackRow = within(card).getByText('Attack Bonus').closest('.attack-card__row');
    expect(attackRow).not.toBeNull();
    const attackValue = attackRow?.querySelector('.attack-card__value');
    expect(attackValue?.textContent).toBe(String(3));

    const damageRow = within(card).getByText('Damage').closest('.attack-card__row');
    expect(damageRow).not.toBeNull();
    expect(
      within(damageRow).getByText('1d6+1 Bludgeoning'),
    ).toBeInTheDocument();
  });

  test('monk uses dexterity for unarmed strikes', () => {
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: {},
          weapon: [],
          spells: [],
          occupation: [{ Name: 'Monk', Level: 2 }],
        }}
        strMod={5}
        dexMod={1}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const card = screen.getByText('Unarmed Strike').closest('.attack-card');
    expect(card).not.toBeNull();
    if (!card) throw new Error('Unarmed Strike card not found');

    const attackRow = within(card).getByText('Attack Bonus').closest('.attack-card__row');
    expect(attackRow).not.toBeNull();
    const attackValue = attackRow?.querySelector('.attack-card__value');
    expect(attackValue?.textContent).toBe(String(3));

    const damageRow = within(card).getByText('Damage').closest('.attack-card__row');
    expect(damageRow).not.toBeNull();
    expect(damageRow).toHaveTextContent(/1d6\s*\+1\s*Bludgeoning/);
  });

  test('monk uses strength for non-light martial melee weapons', () => {
    const weapon = {
      name: 'Glaive',
      damage: '1d10 slashing',
      category: 'Martial Melee Weapon',
      source: 'weapon',
      properties: ['Heavy', 'Reach'],
    };

    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          weapon: [],
          spells: [],
          occupation: [{ Name: 'Monk', Level: 2 }],
        }}
        strMod={5}
        dexMod={1}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const card = screen.getByText('Glaive').closest('.attack-card');
    expect(card).not.toBeNull();
    if (!card) throw new Error('Glaive card not found');

    const attackRow = within(card).getByText('Attack Bonus').closest('.attack-card__row');
    expect(attackRow).not.toBeNull();
    const attackValue = attackRow?.querySelector('.attack-card__value');
    expect(attackValue?.textContent).toBe(String(7));

    const damageRow = within(card).getByText('Damage').closest('.attack-card__row');
    expect(damageRow).not.toBeNull();
    expect(
      within(damageRow).getByText('1d10+5 Slashing'),
    ).toBeInTheDocument();
  });

  test('multi-part weapon damage applies ability modifier once', () => {
    const weapon = {
      name: 'Storm Blade',
      damage: '2d8 slashing + 1d6 lightning',
      category: 'melee',
      source: 'weapon',
      properties: ['Versatile'],
    };
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          spells: [],
        }}
        strMod={3}
        atkBonus={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const card = screen.getByText('Storm Blade').closest('.attack-card');
    expect(card).not.toBeNull();
    const slashing = within(card).getByText('2d8+3 Slashing');
    const lightning = within(card).getByText('1d6 Lightning');
    expect(slashing.textContent).toBe('2d8+3 Slashing');
    expect(lightning.textContent).toBe('1d6 Lightning');

    const deterministicRoll = (count, sides) => Array(count).fill(1);
    expect(
      calculateDamage(weapon.damage, 3, false, deterministicRoll)
    ).toMatchObject({
      total: 6,
      breakdown: '5 slashing + 1 lightning',
      diceRolls: [
        { sides: 8, value: 1, type: 'slashing', category: 'base' },
        { sides: 8, value: 1, type: 'slashing', category: 'base' },
        { sides: 6, value: 1, type: 'lightning', category: 'base' },
      ],
    });
  });

  test('spell damage segments include type classes', () => {
    const spell = {
      name: 'Fire Bolt',
      level: 1,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
        strMod={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const card = screen.getByText('Fire Bolt').closest('.attack-card');
    expect(card).not.toBeNull();
    const fire = within(card).getByText('1d10 Fire');
    expect(fire).toHaveClass('damage-fire');
    expect(fire.textContent).toBe('1d10 Fire');
  });

  test('spell damage displays type in title case', () => {
    const spell = {
      name: 'Chill Touch',
      level: 0,
      damage: '2d8 necrotic',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
        strMod={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const card = screen.getByText('Chill Touch').closest('.attack-card');
    expect(card).not.toBeNull();
    const necrotic = within(card).getByText('2d8 Necrotic');
    expect(necrotic).toHaveClass('damage-necrotic');
    expect(necrotic.textContent).toBe('2d8 Necrotic');
  });

  test('renders fiendish legacy damaging spells and rolls on click', async () => {
    const infernalLegacy = {
      label: 'Infernal Legacy',
      spells: [
        { name: 'Fire Bolt', unlockedAtLevel: 1, spellLevel: 'Cantrip' },
        { name: 'Hellish Rebuke', unlockedAtLevel: 3, spellLevel: '1st-level' },
        { name: 'Hold Person', unlockedAtLevel: 5, spellLevel: '2nd-level' },
      ],
    };

    const form = {
      diceColor: '#000000',
      weapon: [],
      spells: [],
      occupation: [{ Name: 'Warlock', Level: 5 }],
      race: {
        name: 'Tiefling',
        fiendishLegacies: { infernal: infernalLegacy },
      },
      tieflingLegacyKey: 'infernal',
    };

    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      render(
        <PlayerTurnActions form={form} strMod={0} dexMod={0} conMod={0} />
      );

      act(() => {
        fireEvent.click(screen.getByTitle('Attack'));
      });

      await screen.findByText('Fiendish Legacy');

      expect(screen.getByText('Fire Bolt')).toBeInTheDocument();
      expect(screen.getByText('Hellish Rebuke')).toBeInTheDocument();
      expect(screen.queryByText('Hold Person')).not.toBeInTheDocument();

      const fireBoltCard = screen.getByText('Fire Bolt').closest('.attack-card');
      expect(fireBoltCard).not.toBeNull();
      if (!fireBoltCard) throw new Error('missing Fire Bolt card');

      const rollButton = within(fireBoltCard).getByLabelText(/Roll damage/i);
      await act(async () => {
        fireEvent.click(rollButton);
      });

      await waitFor(() => {
        const valueNode = document.getElementById('damageValue');
        if (!valueNode) throw new Error('missing damage value node');
        const text = valueNode.textContent || '';
        if (!/^\d+$/.test(text) || text === '0') {
          throw new Error('waiting');
        }
      });
    } finally {
      Math.random = originalRandom;
    }
  });

  test('weapon attack roll adds attack bonus to d20 result', async () => {
    const weapon = {
      name: 'Longsword',
      damage: '1d8 slashing',
      category: 'martial melee weapon',
      source: 'weapon',
      attackBonus: 1,
    };
    const originalRandom = Math.random;
    Math.random = () => 0.4;

    try {
      render(
        <PlayerTurnActions
          form={{
            diceColor: '#000000',
            equipment: { mainHand: weapon },
            spells: [],
            proficiencyBonus: 3,
          }}
          strMod={2}
          dexMod={0}
        />
      );

      act(() => {
        fireEvent.click(screen.getByTitle('Attack'));
      });

      const card = screen.getByText('Longsword').closest('.attack-card');
      expect(card).not.toBeNull();
      if (!card) throw new Error('missing Longsword card');

    const toHitButton = within(card).getByLabelText(/Roll to hit/i);

    rollDiceWithBox.mockImplementationOnce(() =>
      Promise.resolve({ rolls: [[9]] })
    );

    await act(async () => {
      fireEvent.click(toHitButton);
    });

      await waitFor(() => {
        const valueNode = document.getElementById('damageValue');
        if (!valueNode) throw new Error('missing damage value node');
        expect(valueNode.textContent).toBe('15');
      });
    } finally {
      Math.random = originalRandom;
    }
  });

  test('ranged spell attack roll uses spell ability and proficiency bonus', async () => {
    const spell = {
      name: 'Fire Bolt',
      level: 0,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };

    const originalRandom = Math.random;
    Math.random = () => 0.2;

    rollDiceWithBox.mockImplementationOnce(() =>
      Promise.resolve({ rolls: [[15]] })
    );

    const events = [];
    const listener = (event) => {
      events.push(event);
    };
    window.addEventListener('damage-roll', listener);

    try {
      render(
        <PlayerTurnActions
          form={{
            diceColor: '#000000',
            weapon: [],
            spells: [spell],
            occupation: [{ Name: 'Wizard', Level: 5 }],
          }}
          strMod={0}
          dexMod={0}
          spellAbilityMod={3}
          spellAbilityKey="int"
        />
      );

      act(() => {
        fireEvent.click(screen.getByTitle('Attack'));
      });

      const card = screen.getByText('Fire Bolt').closest('.attack-card');
      expect(card).not.toBeNull();
      if (!card) throw new Error('missing Fire Bolt card');

      expect(within(card).getByText('Attack Bonus')).toBeInTheDocument();
      expect(within(card).getByText('+6')).toBeInTheDocument();

      const attackButton = within(card).getByLabelText(/Roll spell attack/i);

      await act(async () => {
        fireEvent.click(attackButton);
      });

      await waitFor(() => {
        const valueNode = document.getElementById('damageValue');
        if (!valueNode) throw new Error('missing damage value node');
        expect(valueNode.textContent).toBe('21');
      });

      const damageEventCall = events.find(
        (evt) => evt instanceof CustomEvent && evt.type === 'damage-roll'
      );
      expect(damageEventCall).toBeTruthy();
      if (damageEventCall instanceof CustomEvent) {
        expect(damageEventCall.detail.breakdown).toBe(
          '15 (d20) +3 Intelligence Modifier +3 Proficiency Bonus'
        );
      }
    } finally {
      window.removeEventListener('damage-roll', listener);
      Math.random = originalRandom;
    }
  });

  test('healing spells roll for numeric totals', async () => {
    const spell = {
      name: 'Healing Word',
      level: 1,
      damage: '1d4',
      castingTime: '1 bonus action',
      range: '60 feet',
      duration: 'Instantaneous',
      casterType: 'Cleric',
    };
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      render(
        <PlayerTurnActions
          form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
          strMod={0}
          dexMod={0}
        />
      );
      act(() => {
        fireEvent.click(screen.getByTitle('Attack'));
      });
      const card = screen.getByText('Healing Word').closest('.attack-card');
      expect(card).not.toBeNull();
      const rollButton = within(card).getByLabelText(/Roll damage/i);
      await act(async () => {
        fireEvent.click(rollButton);
      });
      await waitFor(() => {
        const valueNode = document.getElementById('damageValue');
        if (!valueNode) throw new Error('missing damage value');
        const text = valueNode.textContent;
        if (!text || text === '0' || !/^\d+$/.test(text)) {
          throw new Error('waiting');
        }
      });
      const result = document.getElementById('damageValue').textContent;
      expect(result).toMatch(/^\d+$/);
      expect(result).not.toBe('0');
    } finally {
      Math.random = originalRandom;
    }
  });

  test('shows breath attack details for dragonborn ancestry', () => {
    const ancestry = {
      label: 'Gold (Fire)',
      damageType: 'Fire',
      breathWeapon: { shape: '15 ft. cone', save: 'Dexterity' },
    };
    const race = {
      name: 'Dragonborn',
      dragonAncestries: { gold: ancestry },
      selectedAncestryKey: 'gold',
      selectedAncestry: ancestry,
    };
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          race,
          equipment: {},
          spells: [],
          occupation: [{ Level: '6' }],
        }}
        strMod={0}
        dexMod={0}
        conMod={2}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const breathCard = screen.getByText('Gold (Fire)').closest('.attack-card');
    expect(breathCard).toBeInTheDocument();
    expect(within(breathCard).getByText('Save DC')).toBeInTheDocument();
    expect(within(breathCard).getByText('13')).toBeInTheDocument();
    const fireDamage = within(breathCard).getByText((content, element) => {
      return (
        element.textContent === '2d10 Fire' &&
        element.classList.contains('damage-fire')
      );
    });
    expect(fireDamage).toHaveClass('damage-fire');
    expect(
      within(breathCard).getByText('15 ft. cone • Dexterity Save')
    ).toBeInTheDocument();
  });

  test('breath attack damage segments include type classes', () => {
    const ancestry = {
      label: 'Blue (Lightning)',
      damageType: 'lightning',
      breathWeapon: { shape: '5 by 30 ft. line', save: 'Dexterity' },
    };
    const race = {
      name: 'Dragonborn',
      dragonAncestries: { blue: ancestry },
      selectedAncestryKey: 'blue',
      selectedAncestry: ancestry,
    };
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          race,
          equipment: {},
          spells: [],
          occupation: [{ Level: '6' }],
        }}
        strMod={0}
        dexMod={0}
        conMod={2}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const breathCard = screen.getByText('Blue (Lightning)').closest('.attack-card');
    expect(breathCard).toBeInTheDocument();
    const damage = within(breathCard).getByText((content, element) => {
      return (
        element.textContent === '2d10 Lightning' &&
        element.classList.contains('damage-lightning')
      );
    });
    expect(damage).toHaveClass('damage-lightning');
  });

  test('does not render breath attack card for non-dragonborn characters', () => {
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          race: { name: 'Human' },
          equipment: {},
          spells: [],
          occupation: [{ Level: '6' }],
        }}
        strMod={0}
        dexMod={0}
        conMod={2}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    expect(screen.queryByText('Breath Attack')).not.toBeInTheDocument();
  });
});

describe('PlayerTurnActions damage log', () => {
  test('multi-type weapon logs breakdown and shows total', async () => {
    const weapon = {
      name: 'Frost Brand',
      damage: '1d4 cold + 1d6 slashing',
      category: 'melee',
      source: 'weapon',
    };
    const orig = Math.random;
    Math.random = () => 0; // deterministic rolls
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          spells: [],
        }}
        strMod={2}
        atkBonus={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard('Frost Brand');
    act(() => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => {
      const el = document.getElementById('damageValue');
      if (!el || el.textContent === '0') throw new Error('waiting');
    });
    expect(document.getElementById('damageValue').textContent).toBe('4');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '⚔️ Log' }));
    });
    const modal = await screen.findByRole('dialog');
    const items = within(modal)
      .getAllByRole('listitem')
      .filter((li) => !li.classList.contains('roll-separator'));
    const item = items[0];
    const [totalLine, breakdownDiv] = item.querySelectorAll('div');
    expect(totalLine).toHaveTextContent('Frost Brand - (4)');
    const breakdownLines = Array.from(breakdownDiv.querySelectorAll('div')).map(
      (d) => d.textContent.trim()
    );
    expect(breakdownLines).toEqual([
      'Damage - (1d4 cold + 1d6 slashing)',
      '- 3 cold',
      '- 1 slashing',
      '- 1',
      '- 1',
      '- +2 STR modifier',
    ]);
    Math.random = orig;
  });

  test('damage log segments use damage type colors', async () => {
    const weapon = {
      name: 'Elemental Blade',
      damage: '1d4 cold + 1d4 fire + 1d4 lightning',
      category: 'melee',
    };
    const orig = Math.random;
    Math.random = () => 0;
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [weapon], spells: [] }}
        strMod={2}
        atkBonus={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard('Elemental Blade');
    act(() => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => {
      const el = document.getElementById('damageValue');
      if (!el || el.textContent === '0') throw new Error('waiting');
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '⚔️ Log' }));
    });
    const modal = await screen.findByRole('dialog');

    const cold = within(modal).getByText('3 cold');
    expect(
      cold.style.color === damageTypeColors.cold ||
        cold.classList.contains('damage-cold')
    ).toBe(true);

    const fire = within(modal).getByText('1 fire');
    expect(
      fire.style.color === damageTypeColors.fire ||
        fire.classList.contains('damage-fire')
    ).toBe(true);

    const lightning = within(modal).getByText('1 lightning');
    expect(
      lightning.style.color === damageTypeColors.lightning ||
        lightning.classList.contains('damage-lightning')
    ).toBe(true);
    Math.random = orig;
  });

  test('logs weapon source names in title case', async () => {
    const weapon = {
      name: 'greatsword of fire',
      damage: '1d6 fire',
      category: 'melee',
    };
    const orig = Math.random;
    Math.random = () => 0;
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [weapon], spells: [] }}
        strMod={2}
        atkBonus={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard(/greatsword of fire/i);
    act(() => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => {
      const el = document.getElementById('damageValue');
      if (!el || el.textContent === '0') throw new Error('waiting');
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '⚔️ Log' }));
    });
    const modal = await screen.findByRole('dialog');
    const items = within(modal)
      .getAllByRole('listitem')
      .filter((li) => !li.classList.contains('roll-separator'));
    const item = items[0];
    const [totalLine, breakdownDiv] = item.querySelectorAll('div');
    expect(totalLine).toHaveTextContent(/greatsword of fire - \(3\)/i);
    const breakdownLines = Array.from(breakdownDiv.querySelectorAll('div')).map(
      (d) => d.textContent.trim()
    );
    expect(breakdownLines).toEqual(['- 3 fire']);
    Math.random = orig;
  });

  test('damaging spell logs name and breakdown', async () => {
    const spell = {
      name: 'Fire Bolt',
      level: 1,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    const orig = Math.random;
    Math.random = () => 0; // deterministic roll
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
        strMod={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard('Fire Bolt');
    act(() => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => {
      const el = document.getElementById('damageValue');
      if (!el || el.textContent === '0') throw new Error('waiting');
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '⚔️ Log' }));
    });
    const modal = await screen.findByRole('dialog');
    const items = within(modal)
      .getAllByRole('listitem')
      .filter((li) => !li.classList.contains('roll-separator'));
    const item = items[0];
    const [totalLine, breakdownDiv] = item.querySelectorAll('div');
    expect(totalLine).toHaveTextContent('Fire Bolt - (1)');
    const breakdownText = breakdownDiv.textContent.replace(/\s+/g, ' ').trim();
    expect(breakdownText).toContain('- 1 fire');
    Math.random = orig;
  });

  test('handles multi-type damage and returns breakdown string', () => {
    const fixedRoll = (count, sides) => Array(count).fill(1);
    expect(
      calculateDamage('1d4 cold + 1d6 slashing', 2, false, fixedRoll)
    ).toMatchObject({
      total: 4,
      breakdown: '3 cold + 1 slashing',
      diceRolls: [
        { sides: 4, value: 1, type: 'cold', category: 'base' },
        { sides: 6, value: 1, type: 'slashing', category: 'base' },
      ],
    });
  });
});

describe('PlayerTurnActions weapon damage display', () => {
  test('weapon damage segments include ability and type classes', () => {
    const weapon = {
      name: 'Frost Brand',
      damage: '1d4 cold + 1d6 slashing',
      category: 'melee',
      source: 'weapon',
    };
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: weapon },
          spells: [],
        }}
        strMod={2}
        atkBonus={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const card = screen.getByText('Frost Brand').closest('.attack-card');
    expect(card).not.toBeNull();
    const cold = within(card).getByText('1d4+2 Cold');
    const slashing = within(card).getByText('1d6 Slashing');
    expect(cold).toHaveClass('damage-cold');
    expect(slashing).toHaveClass('damage-slashing');
    expect(slashing.textContent).toBe('1d6 Slashing');
  });

  test('spell damage segments include type classes', () => {
    const spell = {
      name: 'Fire Bolt',
      level: 1,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
        strMod={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const card = screen.getByText('Fire Bolt').closest('.attack-card');
    expect(card).not.toBeNull();
    const fire = within(card).getByText('1d10 Fire');
    expect(fire).toHaveClass('damage-fire');
    expect(fire.textContent).toBe('1d10 Fire');
  });

  test('includes an unarmed strike attack when no weapons are equipped', () => {
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [] }}
        strMod={3}
        dexMod={0}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const card = screen.getByText('Unarmed Strike').closest('.attack-card');
    expect(card).not.toBeNull();
    expect(within(card).getByText('1d4+3 Bludgeoning')).toBeInTheDocument();
  });

  test('does not duplicate unarmed strike when other weapons are equipped', () => {
    const rapier = {
      name: 'Rapier',
      damage: '1d8 piercing',
      category: 'melee',
      source: 'weapon',
    };

    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: { mainHand: rapier },
          spells: [],
        }}
        strMod={2}
        dexMod={0}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    expect(screen.getByText('Rapier')).toBeInTheDocument();
    const unarmedCards = screen.getAllByText('Unarmed Strike');
    expect(unarmedCards).toHaveLength(1);
  });
});

describe('PlayerTurnActions critical events', () => {
  test('damage-roll event toggles classes on damageAmount', () => {
    jest.useFakeTimers();

    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [] }}
        strMod={0}
        dexMod={0}
      />
    );

    const damage = document.getElementById('damageAmount');

    act(() => {
      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: { value: 5, critical: true, fumble: false },
        })
      );
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(damage.classList.contains('critical-active')).toBe(true);
    expect(damage.classList.contains('critical-failure')).toBe(false);
    expect(damage.classList.contains('pulse-gold')).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: { value: 3, critical: false, fumble: true },
        })
      );
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(damage.classList.contains('critical-active')).toBe(false);
    expect(damage.classList.contains('critical-failure')).toBe(true);
    expect(damage.classList.contains('pulse-red')).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('damage-roll', { detail: { value: 1 } })
      );
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(damage.classList.contains('critical-active')).toBe(false);
    expect(damage.classList.contains('critical-failure')).toBe(false);
    expect(damage.classList.contains('pulse')).toBe(true);
  });

  test('clicking damageAmount toggles critical class', () => {
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [] }}
        strMod={0}
        dexMod={0}
      />
    );

    const damage = document.getElementById('damageAmount');
    const toggle = document.getElementById('damageValue');

    expect(damage.classList.contains('critical-active')).toBe(false);

    act(() => {
      fireEvent.click(toggle);
    });

    expect(damage.classList.contains('critical-active')).toBe(true);

    act(() => {
      fireEvent.click(toggle);
    });

    expect(damage.classList.contains('critical-active')).toBe(false);
  });

  test('manual critical toggle persists after automatic reset timer', () => {
    jest.useFakeTimers();

    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [] }}
        strMod={0}
        dexMod={0}
      />
    );

    const damage = document.getElementById('damageAmount');
    const toggle = document.getElementById('damageValue');

    act(() => {
      window.dispatchEvent(
        new CustomEvent('damage-roll', { detail: { value: 7 } })
      );
    });

    act(() => {
      fireEvent.click(toggle);
    });

    expect(damage.classList.contains('critical-active')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(damage.classList.contains('critical-active')).toBe(true);

    jest.useRealTimers();
  });
});

describe('PlayerTurnActions spell casting', () => {
  test('invokes onCastSpell when a spell is rolled', async () => {
    const onCastSpell = jest.fn();
    const spell = {
      name: 'Fire Bolt',
      level: 1,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [spell] }}
        strMod={0}
        dexMod={0}
        onCastSpell={onCastSpell}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const rollButton = await getRollDamageButtonForCard('Fire Bolt');
    await act(async () => {
      fireEvent.click(rollButton);
    });

    await waitFor(() =>
      expect(onCastSpell).toHaveBeenCalledWith(
        expect.objectContaining({
          level: spell.level,
          slotType: undefined,
          damage: expect.any(Number),
          breakdown: expect.any(String),
          castingTime: spell.castingTime,
          name: spell.name,
        })
      )
    );
  });

  test('damaging spells display rolled damage instead of spell name', async () => {
    const orig = Math.random;
    Math.random = () => 0.5;
    const spell = {
      name: 'Fire Bolt',
      level: 1,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [spell] }}
        strMod={0}
        atkBonus={0}
        dexMod={0}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const rollButton = await getRollDamageButtonForCard('Fire Bolt');
    act(() => {
      fireEvent.click(rollButton);
    });

    await waitFor(() => {
      const el = document.getElementById('damageValue');
      if (!el || el.textContent === '0') throw new Error('waiting');
    });
    const el = document.getElementById('damageValue');
    expect(el.classList.contains('spell-cast-label')).toBe(false);
    expect(el.textContent).not.toBe(spell.name);
    Math.random = orig;
  });

  test('consumes action circle for 1 action spells', async () => {
    const state = {
      action: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      bonus: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
    };
    const onCastSpell = ({ castingTime }) => {
      if (castingTime?.includes('1 action')) {
        const idx = Object.keys(state.action).find(
          (k) => state.action[k] === 'active'
        );
        if (idx !== undefined) state.action[idx] = 'used';
      }
    };
    const spell = {
      name: 'Fire Bolt',
      level: 1,
      damage: '1d10 fire',
      castingTime: '1 action',
      range: '120 feet',
      duration: 'Instantaneous',
      casterType: 'Wizard',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [spell] }}
        strMod={0}
        dexMod={0}
        onCastSpell={onCastSpell}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard('Fire Bolt');
    await act(async () => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => expect(state.action[0]).toBe('used'));
    expect(state.bonus[0]).toBe('active');
  });

  test('consumes bonus circle for 1 bonus action spells', async () => {
    const state = {
      action: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      bonus: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
    };
    const onCastSpell = ({ castingTime }) => {
      if (castingTime?.includes('1 bonus action')) {
        const idx = Object.keys(state.bonus).find(
          (k) => state.bonus[k] === 'active'
        );
        if (idx !== undefined) state.bonus[idx] = 'used';
      }
    };
    const spell = {
      name: 'Flame Blade',
      level: 2,
      damage: '3d6 fire',
      castingTime: '1 bonus action',
      range: 'Self',
      duration: 'Concentration',
      casterType: 'Druid',
    };
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells: [spell] }}
        strMod={0}
        dexMod={0}
        onCastSpell={onCastSpell}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard('Flame Blade');
    await act(async () => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => expect(state.bonus[0]).toBe('used'));
    expect(state.action[0]).toBe('active');
  });

  test('spells are grouped by casterType and sorted by level', async () => {
    const spells = [
      {
        name: 'Fireball',
        level: 3,
        damage: '8d6 fire',
        castingTime: '1 action',
        range: '150 feet',
        duration: 'Instantaneous',
        casterType: 'Wizard',
      },
      {
        name: 'Cure Wounds',
        level: 1,
        damage: '1d8',
        castingTime: '1 action',
        range: 'Touch',
        duration: 'Instantaneous',
        casterType: 'Cleric',
      },
      {
        name: 'Magic Missile',
        level: 1,
        damage: '1d4',
        castingTime: '1 action',
        range: '120 feet',
        duration: 'Instantaneous',
        casterType: 'Wizard',
      },
    ];
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', equipment: {}, spells }}
        strMod={0}
        dexMod={0}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const titles = Array.from(
      document.querySelectorAll('.attack-card__title')
    )
      .map((el) => el.textContent)
      .filter((text) => spells.some((spell) => spell.name === text));
    expect(titles).toEqual(['Cure Wounds', 'Magic Missile', 'Fireball']);
  });
});

describe('cantrip scaling', () => {
  const baseSpell = {
    name: 'Fire Bolt',
    level: 0,
    damage: '1d10',
    scaling: { 5: '2d10', 11: '3d10', 17: '4d10' },
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    casterType: 'Wizard',
  };

  const renderAndCast = async (lvl) => {
    const orig = Math.random;
    Math.random = () => 0; // always roll minimum = 1
    render(
      <PlayerTurnActions
        form={{
          diceColor: '#000000',
          equipment: {},
          spells: [{ ...baseSpell }],
          occupation: [{ Level: lvl }],
        }}
        strMod={0}
        dexMod={0}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });
    const rollButton = await getRollDamageButtonForCard(baseSpell.name);
    act(() => {
      fireEvent.click(rollButton);
    });
    await waitFor(() => {
      const el = document.getElementById('damageValue');
      if (!el || el.textContent === '0') throw new Error('waiting');
    });
    const text = document.getElementById('damageValue').textContent;
    Math.random = orig;
    return text;
  };

  test('uses 2d10 at level 5', async () => {
    const value = await renderAndCast(5);
    expect(value).toBe('2');
  });

  test('uses 3d10 at level 11', async () => {
    const value = await renderAndCast(11);
    expect(value).toBe('3');
  });

  test('uses 4d10 at level 17', async () => {
    const value = await renderAndCast(17);
    expect(value).toBe('4');
  });
});
