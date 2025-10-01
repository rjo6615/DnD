import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';

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

  const triggerSparkles = (face, isRepeat = false) => {
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
  };

  const rollTo = (face) => {
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
  };

  const handleRandomizeClick = (event) => {
    event.preventDefault();
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
        {showCriticalSparkles && <div className="sparkle"></div>}
        {showFumbleSparkles && <div className="sparkle1"></div>}
        <div
          role="button"
          aria-label="Roll a d20"
          onClick={handleRandomizeClick}
          className={`die ${rolling ? 'rolling' : ''}`}
          data-face={activeFace}
        >
          {faceElements}
        </div>
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
