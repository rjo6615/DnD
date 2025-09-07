import React from 'react';
import getSpellSlots from './spellUtils';

export default function SpellSlotTabs({ occupation, usedSlots = {}, setUsedSlots }) {
  const slots = getSpellSlots(occupation);
  const remaining = slots.map((total, lvl) => total - (usedSlots[lvl] || 0));
  const totalRemaining = remaining.reduce((sum, n) => sum + n, 0);

  return (
    <div className="spell-slot-tabs" data-testid="spell-slot-tabs">
      <div className="spell-slot-tab" data-testid="slot-total">Total {totalRemaining}</div>
      {remaining.map((count, lvl) =>
        lvl > 0 && slots[lvl] > 0 ? (
          <div
            key={lvl}
            className={`spell-slot-tab ${count <= 0 ? 'zero' : 'available'}`}
            data-testid={`slot-level-${lvl}`}
          >
            {`${lvl}:${count}`}
          </div>
        ) : null
      )}
    </div>
  );
}
