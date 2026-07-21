import React, { useEffect, useRef, useState } from 'react';
import { getCriticalRollPresentation, subscribeToCriticalRolls } from '../../utils/criticalRolls';
import { notify } from '../../utils/notification';

const DURATION = 2200;
export default function CriticalRollEffectHost() {
  const [active, setActive] = useState(null);
  const queue = useRef([]); const timer = useRef(null);
  useEffect(() => {
    const show = (event) => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setActive({ event, reduced: true }); return; }
      if (active) { if (queue.current.length < 3) queue.current.push(event); return; }
      setActive({ event, reduced: false });
    };
    return subscribeToCriticalRolls(show);
  }, [active]);
  useEffect(() => {
    if (!active) return undefined;
    const { event } = active; const p = getCriticalRollPresentation(event);
    timer.current = setTimeout(() => {
      notify(`${event.character?.name || event.character?.characterName || event.source || 'A roll'} rolled a natural ${event.rawRoll} (${event.total} total).`, p.tone === 'success' ? 'success' : 'danger');
      const next = queue.current.shift();
      setActive(next ? { event: next, reduced: false } : null);
    }, active.reduced ? 1400 : DURATION);
    return () => clearTimeout(timer.current);
  }, [active]);
  if (!active) return <div className="critical-roll-live" aria-live="assertive" />;
  const { event, reduced } = active; const { title, tone } = getCriticalRollPresentation(event);
  const name = event.character?.name || event.character?.characterName || event.source || 'Character';
  return <div className={`critical-roll-effect critical-roll-effect--${tone} ${reduced ? 'critical-roll-effect--reduced' : ''}`} role="status" aria-live="assertive" onClick={() => setActive(null)}>
    <div className="critical-roll-effect__vignette" /><div className="critical-roll-effect__origin" aria-hidden="true" />
    {!reduced && <div className="critical-roll-effect__particles" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>}
    <section className="critical-roll-effect__banner"><span className="critical-roll-effect__eyebrow">d20 • {event.rollContext.replace('-', ' ')}</span><strong>{title}</strong><p>{name} rolled a natural {event.rawRoll}</p><b>Total: {event.total}</b></section>
  </div>;
}
