import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const DICE_BOX_SCRIPT_ID = 'dice-box-lib';
const DICE_BOX_SCRIPT_SRC =
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.0.10/dist/dice-box.min.js';
const DICE_BOX_ASSET_PATH =
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.0.10/dist/';

let diceBoxScriptPromise = null;

function logDiceBoxError(error) {
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

function loadDiceBoxScript() {
  if (diceBoxScriptPromise) {
    return diceBoxScriptPromise;
  }

  if (typeof document === 'undefined') {
    return Promise.reject(new Error('DiceBox unavailable in this environment.'));
  }

  const existing = document.getElementById(DICE_BOX_SCRIPT_ID);
  if (existing) {
    diceBoxScriptPromise = new Promise((resolve, reject) => {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load DiceBox script.')),
        { once: true }
      );
    });

    return diceBoxScriptPromise;
  }

  diceBoxScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = DICE_BOX_SCRIPT_ID;
    script.src = DICE_BOX_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => {
      script.remove();
      diceBoxScriptPromise = null;
      reject(new Error('Failed to load DiceBox script.'));
    };
    document.body.appendChild(script);
  });

  return diceBoxScriptPromise;
}

export const sanitizeDiceDetails = (details) => {
  if (!Array.isArray(details)) {
    return [];
  }

  return details
    .map((die) => {
      if (!die) return null;
      const sides = Number(die.sides);
      if (!Number.isFinite(sides) || sides < 2) {
        return null;
      }

      const value = Number(die.value);
      return {
        ...die,
        sides,
        value: Number.isFinite(value) ? value : die.value,
      };
    })
    .filter(Boolean);
};

export const buildDiceNotation = (dice) => {
  if (!Array.isArray(dice) || dice.length === 0) {
    return '';
  }

  const counts = dice.reduce((acc, die) => {
    const key = Number(die.sides);
    if (!Number.isFinite(key) || key < 2) {
      return acc;
    }
    const prev = acc.get(key) || 0;
    acc.set(key, prev + 1);
    return acc;
  }, new Map());

  return Array.from(counts.entries())
    .map(([sides, count]) => `${count}d${sides}`)
    .join(' + ');
};

const DamageDiceBox = forwardRef(({ color, onStateChange }, ref) => {
  const containerRef = useRef(null);
  const diceBoxRef = useRef(null);
  const statusRef = useRef('idle');
  const colorRef = useRef(color || '#4cc9f0');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    colorRef.current = color || '#4cc9f0';
  }, [color]);

  useEffect(() => {
    statusRef.current = status;
    if (typeof onStateChange === 'function') {
      onStateChange(status);
    }
  }, [status, onStateChange]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      setStatus('error');
      return undefined;
    }

    const container = containerRef.current;
    if (!container) {
      setStatus('error');
      return undefined;
    }

    let isMounted = true;
    setStatus('loading');

    loadDiceBoxScript()
      .then(() => {
        if (!isMounted) return;
        if (typeof window.DiceBox !== 'function') {
          throw new Error('DiceBox global not available.');
        }

        const elementId =
          container.id || `damage-dice-box-${Math.random().toString(36).slice(2)}`;
        container.id = elementId;

        const instance = new window.DiceBox(`#${elementId}`, {
          assetPath: DICE_BOX_ASSET_PATH,
          theme: 'default',
          themeColor: colorRef.current,
        });

        diceBoxRef.current = instance;

        return instance.init().then(() => {
          if (!isMounted) return;
          setStatus('ready');
        });
      })
      .catch((error) => {
        logDiceBoxError(error);
        if (isMounted) {
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
      const instance = diceBoxRef.current;
      diceBoxRef.current = null;
      if (instance) {
        try {
          if (typeof instance.destroy === 'function') {
            instance.destroy();
          } else if (typeof instance.clear === 'function') {
            instance.clear();
          }
        } catch (error) {
          logDiceBoxError(error);
        }
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      rollDice(rawDetails = []) {
        const sanitized = sanitizeDiceDetails(rawDetails);

        if (
          !diceBoxRef.current ||
          statusRef.current !== 'ready' ||
          sanitized.length === 0
        ) {
          return { used3d: false, sanitized };
        }

        const notation = buildDiceNotation(sanitized);
        if (!notation) {
          return { used3d: false, sanitized };
        }

        try {
          const maybePromise = diceBoxRef.current.roll(notation, {
            theme: 'default',
            themeColor: colorRef.current,
          });

          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch((error) => {
              logDiceBoxError(error);
            });
          }

          return { used3d: true, sanitized };
        } catch (error) {
          logDiceBoxError(error);
          return { used3d: false, sanitized };
        }
      },
    }),
    []
  );

  return <div ref={containerRef} className="damage-roller__dice-box" aria-hidden="true" />;
});

DamageDiceBox.displayName = 'DamageDiceBox';

export default DamageDiceBox;
