import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  registerDiceBoxContainer,
  setDiceBoxThemeColor,
  subscribeToDiceBoxAvailability,
} from '../../../utils/diceBoxManager';
import {
  createDiceCategoryStyles,
  DEFAULT_DICE_COLOR,
  normalizeDiceColor,
} from '../../../utils/diceColors';

const DIE_SIZE_BY_SIDES = new Map([
  [4, 44],
  [6, 46],
  [8, 48],
  [10, 50],
  [12, 54],
  [20, 58],
]);

const CATEGORY_CLASSNAMES = {
  bonus: 'damage-die--bonus',
  critical: 'damage-die--critical',
  'critical-bonus': 'damage-die--critical-bonus',
};

const SUPPORTED_POLYHEDRAL_SIDES = new Set([4, 6, 8, 10, 12, 20]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatCssNumber = (value, unit, digits = 2) => {
  if (!Number.isFinite(value)) {
    return `0${unit}`;
  }
  const normalized = Math.abs(value) < 1e-4 ? 0 : value;
  return `${normalized.toFixed(digits)}${unit}`;
};

const formatSeconds = (value) => formatCssNumber(value, 's', 3);

const createSeededRandom = (seedValue) => {
  const stringSeed = String(seedValue ?? '');
  let hash = 0;
  for (let i = 0; i < stringSeed.length; i += 1) {
    hash = (hash << 5) - hash + stringSeed.charCodeAt(i);
    hash |= 0; // force 32 bit
  }
  return () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const getDieSize = (sides) => {
  const rounded = Math.round(sides);
  if (DIE_SIZE_BY_SIDES.has(rounded)) {
    return DIE_SIZE_BY_SIDES.get(rounded);
  }
  return clamp(52 + rounded * 0.9, 48, 92);
};

const getDieShapeClass = (sides) => {
  const rounded = Math.round(sides);
  if (SUPPORTED_POLYHEDRAL_SIDES.has(rounded)) {
    return `damage-die--d${rounded}`;
  }
  return 'damage-die--generic';
};

const getCategoryClass = (category) => CATEGORY_CLASSNAMES[category] || '';

const toNumericValue = (value) => {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.round(parsed);
  }
  return 0;
};

const toFiniteSides = (sides) => {
  const parsed = Number(sides);
  if (!Number.isFinite(parsed)) {
    return 6;
  }
  return clamp(Math.max(2, Math.round(parsed)), 2, 100);
};

const resolveDamageTypeClass = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed : '';
};

const usePrefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const createDieStyle = (die, index, reduceMotion) => {
  const seed = `${die.id ?? index}-${die.value}-${die.sides}`;
  const random = createSeededRandom(seed);

  const baseDelay = reduceMotion
    ? index * 0.02
    : index * 0.12 + random() * 0.08;
  const duration = reduceMotion ? 0.1 : 0.82 + random() * 0.5;

  const startX = reduceMotion ? 0 : (random() - 0.5) * 260;
  const startY = reduceMotion ? 0 : -130 - random() * 90;
  const startZ = reduceMotion ? 0 : (random() - 0.5) * 200;

  const midX = reduceMotion ? 0 : (random() - 0.5) * 170;
  const midY = reduceMotion ? 0 : -70 - random() * 70;
  const midZ = reduceMotion ? 0 : (random() - 0.5) * 170;

  const endY = reduceMotion ? 0 : 34 + random() * 34;
  const bounce = reduceMotion ? 0 : 6 + random() * 10;

  const rotStartX = reduceMotion ? 0 : random() * 360;
  const rotStartY = reduceMotion ? 0 : random() * 360;
  const rotStartZ = reduceMotion ? 0 : random() * 360;

  const rotMidX = reduceMotion ? 0 : rotStartX + 160 + random() * 220;
  const rotMidY = reduceMotion ? 0 : rotStartY + 180 + random() * 240;
  const rotMidZ = reduceMotion ? 0 : rotStartZ + 140 + random() * 220;

  const rotEndX = reduceMotion ? 0 : random() * 360;
  const rotEndY = reduceMotion ? 0 : random() * 360;
  const rotEndZ = reduceMotion ? 0 : random() * 360;

  return {
    left: '50%',
    '--die-size': formatCssNumber(getDieSize(die.sides), 'px', 0),
    '--drop-delay': formatSeconds(baseDelay),
    '--drop-duration': formatSeconds(duration),
    '--flight-start-x': formatCssNumber(startX, 'px'),
    '--flight-start-y': formatCssNumber(startY, 'px'),
    '--flight-start-z': formatCssNumber(startZ, 'px'),
    '--flight-mid-x': formatCssNumber(midX, 'px'),
    '--flight-mid-y': formatCssNumber(midY, 'px'),
    '--flight-mid-z': formatCssNumber(midZ, 'px'),
    '--flight-end-y': formatCssNumber(endY, 'px'),
    '--flight-settle-bounce': formatCssNumber(bounce, 'px'),
    '--rot-x-start': formatCssNumber(rotStartX, 'deg', 1),
    '--rot-y-start': formatCssNumber(rotStartY, 'deg', 1),
    '--rot-z-start': formatCssNumber(rotStartZ, 'deg', 1),
    '--rot-x-mid': formatCssNumber(rotMidX, 'deg', 1),
    '--rot-y-mid': formatCssNumber(rotMidY, 'deg', 1),
    '--rot-z-mid': formatCssNumber(rotMidZ, 'deg', 1),
    '--rot-x-end': formatCssNumber(rotEndX, 'deg', 1),
    '--rot-y-end': formatCssNumber(rotEndY, 'deg', 1),
    '--rot-z-end': formatCssNumber(rotEndZ, 'deg', 1),
  };
};

const DamageDiceCanvas = ({
  dice = [],
  diceColor,
  instanceKey = null,
  showOverlayDice = false,
}) => {
  const resolvedColor = useMemo(
    () => normalizeDiceColor(diceColor) || DEFAULT_DICE_COLOR,
    [diceColor],
  );
  const reduceMotion = usePrefersReducedMotion();
  const diceBoxRef = useRef(null);
  const [diceBoxReady, setDiceBoxReady] = useState(false);
  const registrationKey = instanceKey ?? '__default__';

  useEffect(() => {
    const reference = diceBoxRef.current || '#damage-dice-box';
    const unregister = registerDiceBoxContainer(reference);
    const unsubscribe = subscribeToDiceBoxAvailability((ready) => {
      setDiceBoxReady(Boolean(ready));
    });

    return () => {
      unregister?.();
      unsubscribe?.();
    };
  }, [registrationKey]);

  useEffect(() => {
    setDiceBoxThemeColor(resolvedColor);
  }, [resolvedColor]);

  const diceElements = useMemo(() => {
    if (!Array.isArray(dice) || dice.length === 0) {
      return [];
    }

    return dice
      .filter((die) => die && Number.isFinite(Number(die.sides)))
      .map((die, index) => {
        const sides = toFiniteSides(die.sides);
        const value = toNumericValue(die.value);
        const color = die.typeColor || resolvedColor;
        const style = {
          ...createDieStyle({ ...die, sides }, index, reduceMotion),
          ...createDiceCategoryStyles(color, die.category),
        };
        const classes = [
          'damage-die',
          getDieShapeClass(sides),
          getCategoryClass(die.category),
          resolveDamageTypeClass(die.typeClass),
          showOverlayDice ? 'damage-die--overlay' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const title = typeof die.type === 'string' && die.type.trim()
          ? `${value} ${die.type}`
          : undefined;

        return (
          <div
            key={die.id || `damage-die-${index}`}
            className={classes}
            style={style}
            role="presentation"
            data-sides={sides}
            title={title}
          >
            <div className="damage-die__icon">
              <div className="damage-die__poly">
                <div className="damage-die__shape" />
                <div className="damage-die__value">{value}</div>
                <div className="damage-die__value damage-die__value--back">{value}</div>
              </div>
            </div>
          </div>
        );
      });
  }, [dice, reduceMotion, resolvedColor, showOverlayDice]);

  return (
    <div className="damage-dice-canvas" aria-hidden="true">
      <div
        id="damage-dice-box"
        ref={diceBoxRef}
        className={`damage-dice-canvas__box ${
          diceBoxReady ? 'damage-dice-canvas__box--ready' : ''
        }`}
      />
      {(showOverlayDice || !diceBoxReady) && diceElements}
    </div>
  );
};

export default DamageDiceCanvas;

