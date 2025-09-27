import React from 'react';
import { render, act, fireEvent, screen, within, waitFor } from '@testing-library/react';
import PlayerTurnActions, * as PlayerTurnActionsModule from './PlayerTurnActions';
import damageTypeColors from '../../../utils/damageTypeColors';

const { calculateDamage } = PlayerTurnActionsModule;

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
    ).toEqual({ total: 4, breakdown: '3 cold + 1 slashing' });
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
    const cold = within(card).getByText(/1d4\+2 cold/);
    const slashing = within(card).getByText(/1d6 slashing/);
    expect(cold).toHaveClass('damage-cold');
    expect(slashing).toHaveClass('damage-slashing');
    expect(slashing.textContent).toBe('1d6 slashing');
  });

  test('multi-part weapon damage applies ability modifier once', () => {
    const weapon = {
      name: 'Storm Blade',
      damage: '2d8 slashing + 1d6 lightning',
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
    const slashing = within(card).getByText(/2d8\+3 slashing/);
    const lightning = within(card).getByText(/1d6 lightning/);
    expect(slashing.textContent).toBe('2d8+3 slashing');
    expect(lightning.textContent).toBe('1d6 lightning');

    const deterministicRoll = (count, sides) => Array(count).fill(1);
    expect(
      calculateDamage(weapon.damage, 3, false, deterministicRoll)
    ).toEqual({ total: 6, breakdown: '5 slashing + 1 lightning' });
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
    const fire = within(card).getByText(/1d10 fire/);
    expect(fire).toHaveClass('damage-fire');
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
    expect(within(breathCard).getByText('3d6 Fire')).toBeInTheDocument();
    expect(
      within(breathCard).getByText('15 ft. cone • Dexterity Save')
    ).toBeInTheDocument();
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
    const rollButton = await screen.findByLabelText('roll');
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
    expect(totalLine).toHaveTextContent('Frost Brand (4)');
    const breakdownLines = Array.from(breakdownDiv.querySelectorAll('div')).map(
      (d) => d.textContent.trim()
    );
    expect(breakdownLines).toEqual(['- 3 cold', '- 1 slashing']);
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
    const rollButton = await screen.findByLabelText('roll');
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
    const rollButton = await screen.findByLabelText('roll');
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
    expect(totalLine).toHaveTextContent('Greatsword of Fire (3)');
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
    const rollButton = await screen.findByLabelText('roll');
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
    expect(totalLine).toHaveTextContent('Fire Bolt (1)');
    const breakdownLines = Array.from(breakdownDiv.querySelectorAll('div')).map(
      (d) => d.textContent.trim()
    );
    expect(breakdownLines).toEqual(['- 1 fire']);
    Math.random = orig;
  });

  test('handles multi-type damage and returns breakdown string', () => {
    const fixedRoll = (count, sides) => Array(count).fill(1);
    expect(
      calculateDamage('1d4 cold + 1d6 slashing', 2, false, fixedRoll)
    ).toEqual({ total: 4, breakdown: '3 cold + 1 slashing' });
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
    const cold = within(card).getByText(/1d4\+2 cold/);
    const slashing = within(card).getByText(/1d6 slashing/);
    expect(cold).toHaveClass('damage-cold');
    expect(slashing).toHaveClass('damage-slashing');
    expect(slashing.textContent).toBe('1d6 slashing');
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
    const fire = within(card).getByText(/1d10 fire/);
    expect(fire).toHaveClass('damage-fire');
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

    expect(damage.classList.contains('critical-active')).toBe(false);

    act(() => {
      fireEvent.click(damage);
    });

    expect(damage.classList.contains('critical-active')).toBe(true);

    act(() => {
      fireEvent.click(damage);
    });

    expect(damage.classList.contains('critical-active')).toBe(false);
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

    const rollButton = await screen.findByLabelText('roll');
    act(() => {
      fireEvent.click(rollButton);
    });

    expect(onCastSpell).toHaveBeenCalledWith(
      expect.objectContaining({
        level: spell.level,
        slotType: undefined,
        damage: expect.any(Number),
        breakdown: expect.any(String),
        castingTime: spell.castingTime,
        name: spell.name,
      })
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

    const rollButton = await screen.findByLabelText('roll');
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
    const rollButton = await screen.findByLabelText('roll');
    act(() => {
      fireEvent.click(rollButton);
    });
    expect(state.action[0]).toBe('used');
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
    const rollButton = await screen.findByLabelText('roll');
    act(() => {
      fireEvent.click(rollButton);
    });
    expect(state.bonus[0]).toBe('used');
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
    const rollButton = await screen.findByLabelText('roll');
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
