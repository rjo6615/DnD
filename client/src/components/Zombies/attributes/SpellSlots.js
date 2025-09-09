import React, { useState, useEffect } from 'react';
import { fullCasterSlots, pactMagic } from '../../../utils/spellSlots';

const SPELLCASTING_CLASSES = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function SpellSlots({ form = {}, longRestCount = 0, shortRestCount = 0 }) {
  const [usedSlots, setUsedSlots] = useState({});
  const [usedWarlock, setUsedWarlock] = useState({});

  const occupations = form.occupation || [];
  let casterLevel = 0;
  let warlockLevel = 0;

  occupations.forEach((occ) => {
    const name = (occ.Name || occ.Occupation || '').toLowerCase();
    const level = Number(occ.Level) || 0;
    if (name === 'warlock') {
      warlockLevel += level;
      return;
    }
    const progression = SPELLCASTING_CLASSES[name];
    if (progression === 'full') {
      casterLevel += level;
    } else if (progression === 'half') {
      casterLevel += level === 1 ? 0 : Math.ceil(level / 2);
    }
  });

  const slotData = fullCasterSlots[casterLevel] || {};
  const warlockData = pactMagic[warlockLevel] || {};

  useEffect(() => {
    setUsedSlots({});
    setUsedWarlock({});
  }, [longRestCount]);

  useEffect(() => {
    setUsedWarlock({});
  }, [shortRestCount]);

  const toggleSlot = (lvl, idx) => {
    setUsedSlots((prev) => {
      const levelState = { ...(prev[lvl] || {}) };
      levelState[idx] = !levelState[idx];
      return { ...prev, [lvl]: levelState };
    });
  };

  const toggleWarlockSlot = (lvl, idx) => {
    setUsedWarlock((prev) => {
      const levelState = { ...(prev[lvl] || {}) };
      levelState[idx] = !levelState[idx];
      return { ...prev, [lvl]: levelState };
    });
  };

  const renderSlots = (data, used, toggle) => {
    const levels = Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b);
    if (levels.length === 0) return null;
    return levels.map((lvl) => {
      const count = data[lvl];
      return (
        <div key={lvl} className="spell-slot">
          <div className="slot-level">{ROMAN[lvl - 1] || lvl}</div>
          <div className="slot-boxes">
            {Array.from({ length: count }).map((_, i) => {
              const isUsed = used[lvl]?.[i];
              return (
                <div
                  key={i}
                  className={`slot-small ${isUsed ? 'slot-used' : 'slot-active'}`}
                  onClick={() => toggle(lvl, i)}
                />
              );
            })}
          </div>
        </div>
      );
    });
  };

  if (
    Object.keys(slotData).length === 0 &&
    Object.keys(warlockData).length === 0
  )
    return null;

  return (
    <div className="spell-slot-container" style={{ display: 'flex', gap: '1rem' }}>
      <div className="regular-slot">{renderSlots(slotData, usedSlots, toggleSlot)}</div>
      <div className="warlock-slot">{renderSlots(warlockData, usedWarlock, toggleWarlockSlot)}</div>
    </div>
  );
}

