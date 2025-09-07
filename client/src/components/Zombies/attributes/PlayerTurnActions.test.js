import React from 'react';
import { render, act } from '@testing-library/react';
import PlayerTurnActions, { calculateDamage } from './PlayerTurnActions';

describe('calculateDamage parser', () => {
  const fixedRoll = (count, sides) => Array(count).fill(1);

  test('handles 10d4', () => {
    expect(calculateDamage('10d4', 0, false, fixedRoll)).toBe(10);
  });

  test('handles 10d4+1', () => {
    expect(calculateDamage('10d4+1', 0, false, fixedRoll)).toBe(11);
  });

  test('handles 1d8 slashing', () => {
    expect(calculateDamage('1d8 slashing', 0, false, fixedRoll)).toBe(1);
  });

  test('handles 2d6 fire', () => {
    expect(calculateDamage('2d6 fire', 0, false, fixedRoll)).toBe(2);
  });

  test('handles flat damage 100', () => {
    expect(calculateDamage('100', 0, false, fixedRoll)).toBe(100);
  });

  test('crit rolls extra dice but adds modifiers once', () => {
    let calls = 0;
    const critRoll = (count, sides) => {
      calls++;
      return Array(count).fill(1);
    };
    expect(calculateDamage('1d4+2', 4, true, critRoll)).toBe(8);
    expect(calls).toBe(2);
  });

  test('flat damage ignores crit flag', () => {
    expect(calculateDamage('100', 0, true, fixedRoll)).toBe(100);
  });
});

describe('PlayerTurnActions critical events', () => {
  test('damage-roll event toggles classes on damageAmount', () => {
    render(
      <PlayerTurnActions
        form={{ diceColor: '#000000', weapon: [], spells: [] }}
        strMod={0}
        atkBonus={0}
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
    expect(damage.classList.contains('critical-active')).toBe(true);
    expect(damage.classList.contains('critical-failure')).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: { value: 3, critical: false, fumble: true },
        })
      );
    });
    expect(damage.classList.contains('critical-active')).toBe(false);
    expect(damage.classList.contains('critical-failure')).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('damage-roll', { detail: { value: 1 } })
      );
    });
    expect(damage.classList.contains('critical-active')).toBe(false);
    expect(damage.classList.contains('critical-failure')).toBe(false);
  });
});
