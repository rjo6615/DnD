import React, { useMemo } from 'react';
import { SLOT_TABLE } from './SpellSelector';

const ROMAN_NUMERALS = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
};

export default function SpellSlotTabs({ form, remainingSlots = {} }) {
  const slotsByLevel = useMemo(() => {
    const totalEffectiveLevel = (form.occupation || []).reduce((sum, occ) => {
      const level = Number(occ.Level) || 0;
      const progression = occ.casterProgression || occ.CasterProgression || 'full';
      const effective = progression === 'half'
        ? level < 2 ? 0 : Math.ceil(level / 2)
        : progression === 'full'
        ? level
        : 0;
      return sum + effective;
    }, 0);

    const slotRow = SLOT_TABLE[totalEffectiveLevel] || [];
    const map = {};
    slotRow.forEach((count, lvl) => {
      if (lvl > 0 && count > 0) {
        map[lvl] = count;
      }
    });
    return map;
  }, [form]);

  return (
    <div className="spell-slot-tabs">
      {Object.entries(slotsByLevel).map(([lvl, count]) => {
        const level = Number(lvl);
        const remaining = remainingSlots[level] ?? count;
        return (
          <div
            className="spell-slot-tab"
            key={level}
            data-testid={`spell-slot-tab-${level}`}
          >
            <div>{ROMAN_NUMERALS[level]}</div>
            <div>
              {Array.from({ length: count }).map((_, idx) => (
                <div
                  key={idx}
                  data-testid="slot"
                  className={`spell-slot ${idx < remaining ? 'available' : 'spent'}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

