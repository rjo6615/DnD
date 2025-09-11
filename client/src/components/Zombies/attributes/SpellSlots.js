import React from 'react';
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

export default function SpellSlots({
  form = {},
  used = {},
  onToggleSlot,
  actionCount: propActionCount,
  bonusCount: propBonusCount,
}) {

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

  const features = form.features || {};
  const actionCount =
    propActionCount ?? features.actionCount ?? 1;
  const bonusCount =
    propBonusCount ?? features.bonusCount ?? 1;

  const regularLevels = Object.keys(slotData)
    .map(Number)
    .sort((a, b) => a - b);
  const warlockLevels = Object.keys(warlockData)
    .map(Number)
    .sort((a, b) => a - b);
  if (regularLevels.length === 0 && warlockLevels.length === 0) return null;

  const renderGroup = (data, type) =>
    Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b)
      .map((lvl) => {
        const count = data[lvl];
        return (
          <div
            key={`${type}-${lvl}`}
            className={`spell-slot ${type === 'warlock' ? 'warlock-slot' : ''}`}
            data-slot-type={type}
            data-slot-level={lvl}
          >
            <div className="slot-level">{ROMAN[lvl - 1] || lvl}</div>
            <div className="slot-boxes">
              {Array.from({ length: count }).map((_, i) => {
                const state = used[`${type}-${lvl}`]?.[i];
                const cls =
                  state === 'used' || state === true
                    ? 'slot-used'
                    : state === 'inactive'
                    ? 'slot-inactive'
                    : 'slot-active';
                return (
                  <div
                    key={i}
                    data-slot-index={i}
                    className={`slot-small ${cls}`}
                    onClick={() => onToggleSlot && onToggleSlot(type, lvl, i)}
                  />
                );
              })}
            </div>
          </div>
        );
      });

  return (
    <div style={{ display: 'flex' }}>
      <div className="spell-slot-container">
        <div className="spell-slot action-slot">
          <div className="slot-level">A</div>
          <div className="slot-boxes">
            {Array.from({ length: actionCount }).map((_, i) => {
              const state = used.action?.[i];
              const cls = state === 'used' ? 'slot-used' : 'slot-active';
              return (
                <div
                  key={i}
                  data-slot-index={i}
                  className={`action-circle ${cls}`}
                  onClick={() =>
                    onToggleSlot && onToggleSlot('action', i, actionCount)
                  }
                />
              );
            })}
          </div>
        </div>
        <div className="spell-slot bonus-slot">
          <div className="slot-level">B</div>
          <div className="slot-boxes">
            {Array.from({ length: bonusCount }).map((_, i) => {
              const state = used.bonus?.[i];
              const cls = state === 'used' ? 'slot-used' : 'slot-active';
              return (
                <div
                  key={i}
                  data-slot-index={i}
                  className={`bonus-circle ${cls}`}
                  onClick={() =>
                    onToggleSlot && onToggleSlot('bonus', i, bonusCount)
                  }
                />
              );
            })}
          </div>
        </div>
        {renderGroup(slotData, 'regular')}
        {warlockLevels.length > 0 && renderGroup(warlockData, 'warlock')}
      </div>
    </div>
  );
}

