import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';

const DEFAULT_DICE_COLOR = '#3366ff';
const SPARKLE_DURATION_MS = 2000;
const SPARKLE_REPEAT_DELAY_MS = 5000;
const DICE_SIDES = 20;
const INITIAL_SIDE = 1;
const ANIMATION_DURATION_MS = 3000;
const DICE_OPACITY = 0.85;

const FACE_TRANSFORMS = [
  {
    translate: [0, -0.525731112119, 0.850650808352],
    axis: [0.178507761564, 0.178507761564, 0.967610437171],
    angle: 91.886163660962,
  },
  {
    translate: [0, -0.525731112119, 0.850650808352],
    axis: [0.778114545054, 0.517357488073, 0.356200764052],
    angle: 58.940212151671,
  },
  {
    translate: [0, -0.525731112119, 0.850650808352],
    axis: [0.700738012384, 0.404571280081, -0.587612386981],
    angle: 88.990592827419,
  },
  {
    translate: [0, -0.525731112119, 0.850650808352],
    axis: [0.429453677404, 0.213001650302, -0.877610298443],
    angle: 147.056319603168,
  },
  {
    translate: [0, -0.525731112119, 0.850650808352],
    axis: [-0.181207684822, -0.04855445281, 0.982245509063],
    angle: 150.50923099225,
  },
  {
    translate: [0, 0.525731112119, 0.850650808352],
    axis: [-0.378179891472, 0.76248585343, 0.524971706861],
    angle: 65.382669633819,
  },
  {
    translate: [0, 0.525731112119, 0.850650808352],
    axis: [-0.311155597754, 0.53893730437, 0.782769938069],
    angle: 131.360492344111,
  },
  {
    translate: [0, 0.525731112119, 0.850650808352],
    axis: [0.258524514791, -0.388825309093, -0.884296304561],
    angle: 159.814765094897,
  },
  {
    translate: [0.850650808352, 0, 0.525731112119],
    axis: [0.280683716343, 0.790546362353, 0.544291374496],
    angle: 114.895552708161,
  },
  {
    translate: [0.850650808352, 0, 0.525731112119],
    axis: [0.178507761564, 0.967610437171, -0.178507761564],
    angle: 91.886163660962,
  },
  {
    translate: [0.525731112119, -0.850650808352, 0],
    axis: [0.749934399504, 0.660705469355, 0.032660055187],
    angle: 125.382669633819,
  },
  {
    translate: [0.525731112119, -0.850650808352, 0],
    axis: [0.429453677404, 0.74383558876, -0.512130994823],
    angle: 147.056319603168,
  },
  {
    translate: [-0.525731112119, -0.850650808352, 0],
    axis: [0.859718176595, 0.289650866037, -0.420698267927],
    angle: 156.427645261959,
  },
  {
    translate: [-0.525731112119, -0.850650808352, 0],
    axis: [-0.553790277491, -0.472189446794, 0.685823195068],
    angle: 152.629422163337,
  },
  {
    translate: [-0.850650808352, 0, 0.525731112119],
    axis: [-0.701166074566, 0.129353282734, 0.701166074566],
    angle: 165.259058481999,
  },
  {
    translate: [0, -0.525731112119, -0.850650808352],
    axis: [0.950945577591, 0.254805099561, 0.175433376805],
    angle: 174.617330366181,
  },
  {
    translate: [0.850650808352, 0, -0.525731112119],
    axis: [0.5873157892, 0.66663337012, 0.458977247365],
    angle: 176.674083488341,
  },
  {
    translate: [0.525731112119, 0.850650808352, 0],
    axis: [0, 1, 0],
    angle: 180,
  },
  {
    translate: [-0.525731112119, 0.850650808352, 0],
    axis: [0.5873157892, -0.66663337012, -0.458977247365],
    angle: 176.674083488341,
  },
  {
    translate: [-0.850650808352, 0, -0.525731112119],
    axis: [-0.950945577591, -0.254805099561, -0.175433376805],
    angle: 174.617330366181,
  },
];

const DIE_FACE_ROTATIONS = [
  { axis: [0.701166, -0.701166, -0.129353], angle: 91.886164 },
  { axis: [0.181208, -0.900261, -0.395845], angle: 97.444455 },
  { axis: [-0.429454, -0.743836, -0.512131], angle: 99.253014 },
  { axis: [-0.859718, -0.289651, -0.420698], angle: 94.786567 },
  { axis: [-0.950946, 0.254805, -0.175433], angle: 90.252653 },
  { axis: [0.311156, -0.923547, 0.224151], angle: 109.828478 },
  { axis: [0.818863, -0.472771, 0.325503], angle: 118.841184 },
  { axis: [0.942397, 0.189689, 0.27551], angle: 107.042726 },
  { axis: [0.615291, -0.721622, -0.317298], angle: 152.629422 },
  { axis: [-0.178508, -0.96761, -0.178508], angle: 165.259058 },
  { axis: [0.035848, -0.566724, -0.823128], angle: 133.574619 },
  { axis: [0, 1, 0], angle: 180 },
  { axis: [-0.429454, -0.213002, -0.87761], angle: 99.253014 },
  { axis: [-0.749934, 0.266264, -0.605559], angle: 114.895553 },
  { axis: [0.701166, -0.129353, 0.701166], angle: 91.886164 },
  { axis: [0.181208, -0.048554, -0.982246], angle: 97.444455 },
  { axis: [0.615291, -0.03892, -0.787338], angle: 152.629422 },
  { axis: [0, 1, 0], angle: 180 },
  { axis: [0.615291, 0.03892, 0.787338], angle: 152.629422 },
  { axis: [0.181208, 0.048554, 0.982246], angle: 97.444455 },
];

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
  const dieRef = useRef(null);

  const shouldApplyColor = renderInline || show;
  const [dieSize, setDieSize] = useState(0);

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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const element = dieRef.current;
    if (!element) {
      return undefined;
    }

    const updateSize = () => {
      const { width } = element.getBoundingClientRect();
      setDieSize(width);
    };

    updateSize();

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateSize());
      observer.observe(element);
    } else {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener('resize', updateSize);
      }
    };
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
    const scale = dieSize > 0 ? dieSize / 2 : 1;
    const center = dieSize > 0 ? dieSize / 2 : 0;

    return FACE_TRANSFORMS.map(({ translate, axis, angle }, index) => {
      const [tx, ty, tz] = translate;
      const transform = `translate3d(${center + tx * scale}px, ${center + ty * scale}px, ${tz * scale}px) rotate3d(${axis[0]}, ${axis[1]}, ${axis[2]}, ${angle}deg)`;
      return (
        <figure className={`face face-${index + 1}`} key={index + 1} style={{ transform }}>
          <span className="face__label">{index + 1}</span>
        </figure>
      );
    });
  }, [dieSize]);

  const dieTransform = useMemo(() => {
    if (rolling) {
      return undefined;
    }

    const orientation = DIE_FACE_ROTATIONS[activeFace - 1];
    if (!orientation) {
      return undefined;
    }

    const [ax, ay, az] = orientation.axis;
    return `rotate3d(${ax}, ${ay}, ${az}, ${orientation.angle}deg)`;
  }, [activeFace, rolling]);

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
          ref={dieRef}
          style={dieTransform ? { transform: dieTransform } : undefined}
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
