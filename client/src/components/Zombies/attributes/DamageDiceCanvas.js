import React, { useEffect, useMemo, useRef } from 'react';
import { DiceSandboxRenderer } from '../../../utils/diceSandbox';

const registerMapEntry = (map, key, node) => {
  if (!map) return;
  if (node) {
    map.set(key, node);
  } else {
    map.delete(key);
  }
};

const DamageDiceCanvas = ({ dice = [] }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const labelsRef = useRef(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new DiceSandboxRenderer(canvas, {
      root: document.documentElement,
      getLabelElement: (id) => labelsRef.current.get(id) || null,
    });
    rendererRef.current = renderer;
    return () => renderer.dispose();
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setLabelResolver((id) => labelsRef.current.get(id) || null);
    rendererRef.current.setDice(dice);
  }, [dice]);

  const labelItems = useMemo(
    () =>
      dice.map((die) => (
        <span
          key={die.id}
          data-die-id={die.id}
          className={`damage-dice-label ${die.typeClass || ''}`.trim()}
          ref={(node) => registerMapEntry(labelsRef.current, die.id, node)}
          style={{ opacity: 0 }}
        >
          {die.value}
        </span>
      )),
    [dice],
  );

  return (
    <div className="damage-dice-canvas">
      <canvas ref={canvasRef} className="damage-dice-canvas__surface" />
      <div className="damage-dice-canvas__labels">{labelItems}</div>
    </div>
  );
};

export default DamageDiceCanvas;
