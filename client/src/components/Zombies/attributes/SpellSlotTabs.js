import React, { useMemo } from 'react';
import { Nav } from 'react-bootstrap';

const SLOT_TABLE = {
  0: Array(10).fill(0),
  1: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function SpellSlotTabs({ form }) {
  const totalEffectiveLevel = useMemo(() => {
    return (form?.occupation || []).reduce((sum, o) => {
      const lvl = Number(o.Level) || 0;
      const progression = o.casterProgression || o.CasterProgression || 'full';
      const effective =
        progression === 'half'
          ? lvl < 2
            ? 0
            : Math.ceil(lvl / 2)
          : progression === 'full'
          ? lvl
          : 0;
      return sum + effective;
    }, 0);
  }, [form?.occupation]);

  const slotRow = SLOT_TABLE[totalEffectiveLevel] || [];
  const levels = slotRow.reduce((acc, slots, lvl) => {
    if (lvl > 0 && slots > 0) acc.push(lvl);
    return acc;
  }, []);

  if (levels.length === 0) return null;

  return (
    <Nav variant="tabs" className="spell-slot-tabs">
      {levels.map((lvl) => (
        <Nav.Item key={lvl}>
          <Nav.Link>{ROMAN_NUMERALS[lvl]}</Nav.Link>
        </Nav.Item>
      ))}
    </Nav>
  );
}

