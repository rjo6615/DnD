import React from 'react';
import { render, act, fireEvent, screen, within, waitFor } from '@testing-library/react';
import PlayerTurnActions, * as PlayerTurnActionsModule from './PlayerTurnActions';

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
    ).toEqual({ total: 6, breakdown: '3 cold + 3 slashing' });
  });
});

describe('PlayerTurnActions weapon damage display', () => {
  test('getDamageString applies ability to each component', () => {
    const weapon = {
      name: 'Frost Brand',
      damage: '1d4 cold + 1d6 slashing',
      category: 'melee',
    };
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
    const card = screen.getByText('Frost Brand').closest('.card');
    expect(
      within(card).getByText('1d4+2 cold + 1d6+2 slashing', { exact: false })
    ).toBeInTheDocument();
  });
});

describe('PlayerTurnActions damage log', () => {
  test('multi-type weapon logs breakdown and shows total', async () => {
    const weapon = {
      name: 'Frost Brand',
      damage: '1d4 cold + 1d6 slashing',
      category: 'melee',
    };
    const orig = Math.random;
    Math.random = () => 0; // deterministic rolls
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
    expect(document.getElementById('damageValue').textContent).toBe('6');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '⚔️ Log' }));
    });
    const modal = await screen.findByRole('dialog');
    expect(
      within(modal).getByText('6 (3 cold + 3 slashing)')
    ).toBeInTheDocument();
    Math.random = orig;
  });

  test('handles multi-type damage and returns breakdown string', () => {
    const fixedRoll = (count, sides) => Array(count).fill(1);
    expect(
      calculateDamage('1d4 cold + 1d6 slashing', 2, false, fixedRoll)
    ).toEqual({ total: 6, breakdown: '3 cold + 3 slashing' });
  });
});

describe('PlayerTurnActions weapon damage display', () => {
  test('getDamageString applies ability to each component', () => {
    const weapon = {
      name: 'Frost Brand',
      damage: '1d4 cold + 1d6 slashing',
      category: 'melee',
    };
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
    const card = screen.getByText('Frost Brand').closest('.card');
    expect(
      within(card).getByText('1d4+2 cold + 1d6+2 slashing', { exact: false })
    ).toBeInTheDocument();
  });
});

describe('PlayerTurnActions critical events', () => {
  test('damage-roll event toggles classes on damageAmount', () => {
    jest.useFakeTimers();

    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [], spells: [] }}
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
        form={{ diceColor: '#000000', weapon: [], spells: [] }}
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
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
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
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
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
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
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
        form={{ diceColor: '#000000', weapon: [], spells: [spell] }}
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
        form={{ diceColor: '#000000', weapon: [], spells }}
        strMod={0}
        dexMod={0}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle('Attack'));
    });

    const header = await screen.findByText('Spell Name');
    const table = header.closest('table');
    const rows = within(table).getAllByRole('row').slice(1);
    const names = rows.map(
      (row) => within(row).getAllByRole('cell')[0].textContent
    );
    expect(names).toEqual(['Cure Wounds', 'Magic Missile', 'Fireball']);
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
          weapon: [],
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
