import { useCallback, useEffect, useRef, useState } from 'react';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const CDN_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/';
const DEFAULT_THROW_FORCE = 2.6;

const normalizeDiceColor = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : null;
};

const mapDiceToEntries = (diceDetails = []) => {
  const groups = new Map();
  diceDetails.forEach((detail) => {
    const sides = Number(detail?.sides);
    if (!Number.isFinite(sides) || sides <= 1) {
      return;
    }
    const normalizedSides = Math.round(sides);
    const key = `d${normalizedSides}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    const value = Number(detail?.value);
    groups.get(key).push(Number.isFinite(value) ? Math.max(1, Math.round(value)) : null);
  });

  const entries = [];
  groups.forEach((values, type) => {
    const sanitized = values.filter((value) => Number.isFinite(value));
    const entry = {
      type,
      qty: values.length,
    };
    if (sanitized.length === values.length && values.length > 0) {
      entry.values = sanitized;
    }
    entries.push(entry);
  });
  return entries;
};

async function loadDiceBoxModule() {
  try {
    return await import('@3d-dice/dice-box');
  } catch (localError) {
    console.warn('Failed to load local DiceBox bundle, falling back to CDN', localError);
    try {
      return await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/dice-box.es.js'
      );
    } catch (cdnError) {
      const error = new Error('Unable to load DiceBox from both local package and CDN.');
      error.cause = cdnError;
      throw error;
    }
  }
}

async function createDiceBoxInstance(DiceBoxCtor, target, assetPath) {
  const instance = new DiceBoxCtor(target, {
    assetPath,
    theme: 'default',
    sounds: false,
    gravity: { x: 0, y: 0, z: -9.81 },
    throwForce: DEFAULT_THROW_FORCE,
  });
  if (typeof instance?.init === 'function') {
    await instance.init();
  }
  return instance;
}

const useDiceBox = ({ color } = {}) => {
  const containerRef = useRef(null);
  const diceBoxRef = useRef(null);
  const pendingRollRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    let cancelled = false;
    let frame = null;
    let diceBoxInstance = null;

    const initialize = async () => {
      const target = containerRef.current;
      if (!target) {
        if (!cancelled) {
          frame = requestAnimationFrame(initialize);
        }
        return;
      }

      try {
        const module = await loadDiceBoxModule();
        const DiceBoxCtor = module?.DiceBox || module?.default;
        if (!DiceBoxCtor) {
          throw new Error('DiceBox constructor export not found.');
        }

        const publicUrl = typeof process !== 'undefined' ? process.env?.PUBLIC_URL : undefined;
        const localAssetPath = `${publicUrl || ''}/dice-box`;
        const normalizedLocalAssetPath = localAssetPath
          ? `${localAssetPath.replace(/\/$/, '')}/`
          : null;
        const assetCandidates = [CDN_ASSET_PATH, normalizedLocalAssetPath].filter(Boolean);

        let lastError;

        for (const assetPath of assetCandidates) {
          try {
            diceBoxInstance = await createDiceBoxInstance(DiceBoxCtor, target, assetPath);
            break;
          } catch (error) {
            lastError = error;
            if (diceBoxInstance && typeof diceBoxInstance.destroy === 'function') {
              diceBoxInstance.destroy();
            }
            diceBoxInstance = null;
          }
        }

        if (!diceBoxInstance) {
          throw lastError || new Error('Unable to initialise DiceBox instance.');
        }

        if (cancelled) {
          if (diceBoxInstance && typeof diceBoxInstance.destroy === 'function') {
            diceBoxInstance.destroy();
          }
          return;
        }

        diceBoxRef.current = diceBoxInstance;
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize 3D dice roller', error);
      }
    };

    frame = requestAnimationFrame(initialize);

    return () => {
      cancelled = true;
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      setIsReady(false);
      if (diceBoxRef.current && typeof diceBoxRef.current.destroy === 'function') {
        diceBoxRef.current.destroy();
      }
      diceBoxRef.current = null;
    };
  }, []);

  const performRoll = useCallback(async (diceBox, diceDetails = []) => {
    if (!diceBox) {
      return undefined;
    }

    if (!Array.isArray(diceDetails) || diceDetails.length === 0) {
      if (typeof diceBox.clear === 'function') {
        diceBox.clear();
      }
      return undefined;
    }

    const mappedEntries = mapDiceToEntries(diceDetails);
    if (mappedEntries.length === 0) {
      if (typeof diceBox.clear === 'function') {
        diceBox.clear();
      }
      return undefined;
    }

    const forcedResults = mappedEntries.every(
      (entry) => Array.isArray(entry.values) && entry.values.length === entry.qty
    )
      ? mappedEntries.flatMap((entry) => entry.values)
      : null;

    const notation = mappedEntries
      .map(({ type, qty }) => {
        const normalizedQty = Number.isFinite(qty) ? Math.max(0, Math.round(qty)) : 0;
        return normalizedQty > 0 ? `${normalizedQty}${type}` : null;
      })
      .filter(Boolean)
      .join(' + ');

    const rollOptions = {
      clear: true,
      ...(forcedResults ? { result: forcedResults } : {}),
    };

    try {
      if (typeof diceBox.roll === 'function') {
        if (notation) {
          try {
            return await diceBox.roll(notation, rollOptions);
          } catch (notationError) {
            console.warn('DiceBox roll with notation failed, retrying with entries', notationError);
          }
        }

        return await diceBox.roll(mappedEntries, rollOptions);
      }
    } catch (error) {
      console.warn('DiceBox roll failed, attempting notation fallback', error);
      try {
        if (notation && typeof diceBox.roll === 'function') {
          return await diceBox.roll(notation, { clear: true });
        }
      } catch (fallbackError) {
        console.error('DiceBox roll failed', fallbackError);
      }
    }

    return undefined;
  }, []);

  const rollDice = useCallback(
    async (diceDetails = []) => {
      const diceBox = diceBoxRef.current;
      if (!diceBox || !isReady) {
        pendingRollRef.current = Array.isArray(diceDetails) ? diceDetails : [];
        return undefined;
      }
      pendingRollRef.current = null;
      return performRoll(diceBox, diceDetails);
    },
    [isReady, performRoll]
  );

  useEffect(() => {
    const diceBox = diceBoxRef.current;
    if (!diceBox) {
      return undefined;
    }

    const normalized = normalizeDiceColor(color);
    if (!normalized) {
      return undefined;
    }

    try {
      if (typeof diceBox.updateConfig === 'function') {
        diceBox.updateConfig({
          theme: {
            ...(diceBox?.config?.theme || {}),
            foreground: normalized,
            primary: normalized,
          },
        });
      } else if (typeof diceBox.setDiceColor === 'function') {
        diceBox.setDiceColor(normalized);
      } else if (diceBox.preferences) {
        diceBox.preferences.theme = {
          ...(diceBox.preferences.theme || {}),
          foreground: normalized,
          primary: normalized,
        };
      }
    } catch (error) {
      console.warn('Failed to update dice color', error);
    }

    if (containerRef.current) {
      containerRef.current.style.setProperty('--dice-box-primary-color', normalized);
    }

    return undefined;
  }, [color]);

  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    const pending = pendingRollRef.current;
    if (pending && diceBoxRef.current) {
      pendingRollRef.current = null;
      performRoll(diceBoxRef.current, pending);
    }
    return undefined;
  }, [isReady, performRoll]);

  useEffect(() => {
    if (!isReady || typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      const diceBox = diceBoxRef.current;
      if (diceBox && typeof diceBox.resize === 'function') {
        try {
          diceBox.resize();
        } catch (error) {
          console.warn('DiceBox resize failed', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isReady]);

  return {
    containerRef,
    rollDice,
    isReady,
  };
};

export default useDiceBox;
