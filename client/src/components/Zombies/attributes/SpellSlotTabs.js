import React, { useEffect, useRef, useState } from 'react';
import toRoman from '../../../utils/toRoman';
import classNames from '../../../utils/classNames';

export default function SpellSlotTabs({
  spellSlots = [],
  pactSlots,
  selectedLevel,
  onLevelFilter,
}) {
  const containerRef = useRef(null);
  const tabRefs = useRef([]);

  const slots = pactSlots ? [...spellSlots, { ...pactSlots, pact: true }] : spellSlots;

  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setShowLeftFade(el.scrollLeft > 0);
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleKeyDown = (idx, level) => (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (idx + 1) % tabRefs.current.length;
      tabRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (idx - 1 + tabRefs.current.length) % tabRefs.current.length;
      tabRefs.current[prev]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onLevelFilter && onLevelFilter(level);
    }
  };

  return (
    <div
      ref={containerRef}
      className={classNames(
        'spell-slot-tabs',
        showLeftFade && 'fade-left',
        showRightFade && 'fade-right'
      )}
      role="tablist"
    >
      {slots.map((slot, idx) => {
        const level = slot.level;
        const total = slot.total || 0;
        const remaining = Math.max(0, Math.min(slot.remaining || 0, total));
        const isSelected = selectedLevel === level;
        const isDim = remaining === 0;

        return (
          <button
            key={slot.pact ? `pact-${level}` : level}
            ref={(el) => (tabRefs.current[idx] = el)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={classNames('spell-slot-tab', isSelected && 'active', isDim && 'dimmed')}
            onClick={() => onLevelFilter && onLevelFilter(level)}
            onKeyDown={handleKeyDown(idx, level)}
          >
            <span className="level-label">{toRoman(level)}</span>
            <span className="pips">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={classNames('pip', i < remaining && 'filled')}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
