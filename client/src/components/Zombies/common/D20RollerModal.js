import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import DiceBoxCanvas from './DiceBoxCanvas';

const DEFAULT_DICE_COLOR = '#3366ff';
const SPARKLE_DURATION_MS = 2000;
const SPARKLE_REPEAT_DELAY_MS = 5000;
const DICE_SIDES = 20;
const INITIAL_SIDE = 1;
const ANIMATION_DURATION_MS = 3000;
const DICE_OPACITY = 0.85;

const normalizeDiceColor = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_DICE_COLOR;
  }

  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? `#${trimmed.slice(1).toLowerCase()}` : DEFAULT_DICE_COLOR;
};

const toRgba = (hexColor, opacity) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const D20RollerModal = ({ show = false, onHide = () => {}, diceColor, renderInline = false }) => {
  const normalizedColor = useMemo(() => normalizeDiceColor(diceColor), [diceColor]);
  const [activeFace, setActiveFace] = useState(INITIAL_SIDE);
  const [rolling, setRolling] = useState(false);
  const [showCriticalSparkles, setShowCriticalSparkles] = useState(false);
  const [showFumbleSparkles, setShowFumbleSparkles] = useState(false);

  const rollTimeoutRef = useRef(null);
  const sparkleTimeoutRef = useRef(null);
  const sparkleRepeatTimeoutRef = useRef(null);
  const previousColorRef = useRef(null);
  const diceBoxControllerRef = useRef(null);
  const [isDiceBoxReady, setIsDiceBoxReady] = useState(false);

  const shouldApplyColor = renderInline || show;

  useEffect(() => {
    if (typeof document === 'undefined' || !shouldApplyColor) {
      return undefined;
    }

    const root = document.documentElement;
    previousColorRef.current = root.style.getPropertyValue('--dice-face-color');
    root.style.setProperty('--dice-face-color', toRgba(normalizedColor, DICE_OPACITY));

    return () => {
      if (previousColorRef.current) {
        root.style.setProperty('--dice-face-color', previousColorRef.current);
      } else {
        root.style.removeProperty('--dice-face-color');
      }
    };
  }, [normalizedColor, shouldApplyColor]);

  useEffect(() => () => {
    clearTimeout(rollTimeoutRef.current);
    clearTimeout(sparkleTimeoutRef.current);
    clearTimeout(sparkleRepeatTimeoutRef.current);
  }, []);

  const getRandomFace = () => Math.floor(Math.random() * DICE_SIDES) + INITIAL_SIDE;

  const handleDiceBoxReadyChange = useCallback((ready) => {
    setIsDiceBoxReady(!!ready);
  }, []);

  const triggerSparkles = useCallback((face, isRepeat = false) => {
    clearTimeout(sparkleTimeoutRef.current);

    if (face === 20) {
      setShowCriticalSparkles(true);
      sparkleTimeoutRef.current = setTimeout(
        () => setShowCriticalSparkles(false),
        SPARKLE_DURATION_MS
      );
    } else if (face === 1) {
      setShowFumbleSparkles(true);
      sparkleTimeoutRef.current = setTimeout(
        () => setShowFumbleSparkles(false),
        SPARKLE_DURATION_MS
      );
    }

    clearTimeout(sparkleRepeatTimeoutRef.current);
    if (!isRepeat && (face === 20 || face === 1)) {
      sparkleRepeatTimeoutRef.current = setTimeout(
        () => triggerSparkles(face, true),
        SPARKLE_REPEAT_DELAY_MS
      );
    }
  }, []);

  const rollTo = useCallback(
    (face) => {
      clearTimeout(rollTimeoutRef.current);
      setActiveFace(face);
      setRolling(false);

      if (face === 20 || face === 1) {
        triggerSparkles(face);
      } else {
        clearTimeout(sparkleTimeoutRef.current);
        clearTimeout(sparkleRepeatTimeoutRef.current);
        setShowCriticalSparkles(false);
        setShowFumbleSparkles(false);
      }
    },
    [triggerSparkles]
  );

  const extractFaceFromResult = useCallback((payload) => {
    if (!payload) {
      return null;
    }

    const candidates = [];

    if (Array.isArray(payload)) {
      candidates.push(...payload);
    } else {
      candidates.push(payload);
      if (Array.isArray(payload.dice)) {
        candidates.push(...payload.dice);
      }
      if (Array.isArray(payload.rolls)) {
        candidates.push(...payload.rolls);
      }
      if (Array.isArray(payload.results)) {
        candidates.push(...payload.results);
      }
      if (Array.isArray(payload.values)) {
        candidates.push(...payload.values);
      }
      if (Array.isArray(payload.rolledDice)) {
        candidates.push(...payload.rolledDice);
      }
    }

    for (const candidate of candidates) {
      if (!candidate) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const value = candidate.value ?? candidate.total ?? candidate.result ?? candidate.roll ?? candidate.face;
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric >= INITIAL_SIDE && numeric <= DICE_SIDES) {
        return numeric;
      }
    }

    const fallbackValue = Number(
      payload.value ?? payload.total ?? payload.result ?? payload.roll ?? payload.face
    );
    return Number.isFinite(fallbackValue) ? fallbackValue : null;
  }, []);

  const handleDiceBoxRollComplete = useCallback(
    (payload) => {
      const face = extractFaceFromResult(payload);
      if (face !== null) {
        rollTo(face);
      }
    },
    [extractFaceFromResult, rollTo]
  );

  const rollWithDiceBox = useCallback(() => {
    const diceBox = diceBoxControllerRef.current;
    if (!isDiceBoxReady || !diceBox || typeof diceBox.roll !== 'function') {
      return false;
    }

    try {
      const result = diceBox.roll(
        [
          {
            id: 'd20',
            sides: DICE_SIDES,
          },
        ],
        { expression: '1d20' }
      );

      return result !== false;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('DiceBox roll invocation failed', error);
      return false;
    }
  }, [isDiceBoxReady]);

  const handleRandomizeClick = (event) => {
    event?.preventDefault?.();
    const usedDiceBox = rollWithDiceBox();
    if (usedDiceBox) {
      setRolling(true);
      return;
    }

    setRolling(true);
    clearTimeout(rollTimeoutRef.current);

    rollTimeoutRef.current = setTimeout(() => {
      setRolling(false);
      let nextFace = getRandomFace();
      while (nextFace === activeFace) {
        nextFace = getRandomFace();
      }
      rollTo(nextFace);
    }, ANIMATION_DURATION_MS);
  };

  const faceElements = useMemo(() => {
    const faces = [];
    for (let i = 1; i <= DICE_SIDES; i += 1) {
      faces.push(<figure className={`face face-${i}`} key={i}></figure>);
    }
    return faces;
  }, []);

  const dieContent = (
    <div className="attack-roll-controls__die">
      <div className="content">
        <div className="attack-roll-controls__dice-layer" aria-hidden="true">
          <DiceBoxCanvas
            ref={diceBoxControllerRef}
            diceColor={diceColor}
            onReadyChange={handleDiceBoxReadyChange}
            onRollComplete={handleDiceBoxRollComplete}
            className="attack-roll-controls__dice-box"
          />
        </div>
        <div className="attack-roll-controls__sparkles" aria-hidden="true">
          {showCriticalSparkles && <div className="sparkle"></div>}
          {showFumbleSparkles && <div className="sparkle1"></div>}
        </div>
        <div
          className={`attack-roll-controls__fallback ${
            isDiceBoxReady ? 'attack-roll-controls__fallback--hidden' : ''
          }`}
          aria-hidden={isDiceBoxReady}
        >
          <div
            className={`die ${rolling ? 'rolling' : ''}`}
            data-face={activeFace}
          >
            {faceElements}
          </div>
        </div>
        <button
          type="button"
          aria-label="Roll a d20"
          onClick={handleRandomizeClick}
          className="attack-roll-controls__trigger"
        ></button>
      </div>
    </div>
  );

  if (renderInline) {
    return dieContent;
  }

  return (
    <Modal centered show={show} onHide={onHide} aria-label="Roll D20 Modal">
      <Modal.Header closeButton>
        <Modal.Title>Roll D20</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="attack-roll-controls">
          {dieContent}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default D20RollerModal;
export { DEFAULT_DICE_COLOR };
