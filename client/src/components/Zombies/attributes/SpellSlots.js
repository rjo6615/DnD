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
  const [used, setUsed] = useState({});

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
    setUsed({});
  }, [longRestCount]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setUsed((prev) => {
      const updated = { ...prev };
      Object.keys(warlockData).forEach((lvl) => {
        delete updated[`warlock-${lvl}`];
      });
      return updated;
    });
  }, [shortRestCount]);

  const toggleSlot = (type, lvl, idx) => {
    const key = `${type}-${lvl}`;
    setUsed((prev) => {
      const levelState = { ...(prev[key] || {}) };
      levelState[idx] = !levelState[idx];
      return { ...prev, [key]: levelState };
    });
  };

  const regularLevels = Object.keys(slotData).map(Number).sort((a, b) => a - b);
  const warlockLevels = Object.keys(warlockData).map(Number).sort((a, b) => a - b);
  if (regularLevels.length === 0 && warlockLevels.length === 0) return null;

  const renderGroup = (data, type) =>
    Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b)
      .map((lvl) => {
        const count = data[lvl];
        return (
          <div key={lvl} className="spell-slot">
            <div className="slot-level">{ROMAN[lvl - 1] || lvl}</div>
            <div className="slot-boxes">
              {Array.from({ length: count }).map((_, i) => {
                const isUsed = used[`${type}-${lvl}`]?.[i];
                return (
                  <div
                    key={i}
                    className={`slot-small ${isUsed ? 'slot-used' : 'slot-active'}`}
                    onClick={() => toggleSlot(type, lvl, i)}
                  />
                );
              })}
            </div>
          </div>
        );
      });

  return (
    <div className="spell-slot-container">
      <div>{renderGroup(slotData, 'regular')}</div>
      {warlockLevels.length > 0 && (
        <div className="warlock-slot">{renderGroup(warlockData, 'warlock')}</div>
      )}
    </div>
  );
}

