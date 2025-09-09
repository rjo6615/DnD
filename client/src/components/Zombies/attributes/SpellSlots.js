import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from 'react-bootstrap';
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
  const [usedRegular, setUsedRegular] = useState({});
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
    setUsedRegular({});
    setUsedWarlock({});
  }, [longRestCount]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setUsedWarlock({});
  }, [shortRestCount]);

  const toggleRegular = (lvl, idx) => {
    setUsedRegular((prev) => {
      const levelState = { ...(prev[lvl] || {}) };
      levelState[idx] = !levelState[idx];
      return { ...prev, [lvl]: levelState };
    });
  };

  const toggleWarlock = (lvl, idx) => {
    setUsedWarlock((prev) => {
      const levelState = { ...(prev[lvl] || {}) };
      levelState[idx] = !levelState[idx];
      return { ...prev, [lvl]: levelState };
    });
  };
  const regularLevels = Object.keys(slotData)
    .map(Number)
    .sort((a, b) => a - b);
  const warlockLevels = Object.keys(warlockData)
    .map(Number)
    .sort((a, b) => a - b);
  if (regularLevels.length === 0 && warlockLevels.length === 0) return null;

  const renderSlots = (data, usedState, toggle) => {
    return Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b)
      .map((lvl) => {
        const count = data[lvl];
        return (
          <div key={lvl} className="spell-slot">
            <div className="slot-level">{ROMAN[lvl - 1] || lvl}</div>
            <div className="slot-boxes">
              {Array.from({ length: count }).map((_, i) => {
                const isUsed = usedState[lvl]?.[i];
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

  const defaultKey = regularLevels.length ? 'spells' : 'pact';

  return (
    <div className="spell-slot-container">
      <Tabs defaultActiveKey={defaultKey} id="spell-slot-tabs">
        {regularLevels.length > 0 && (
          <Tab eventKey="spells" title="Spell Slots">
            {renderSlots(slotData, usedRegular, toggleRegular)}
          </Tab>
        )}
        {warlockLevels.length > 0 && (
          <Tab eventKey="pact" title="Pact Magic">
            {renderSlots(warlockData, usedWarlock, toggleWarlock)}
          </Tab>
        )}
      </Tabs>
    </div>
  );
}

