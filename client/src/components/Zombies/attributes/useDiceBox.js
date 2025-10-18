import { useCallback, useEffect, useRef, useState } from 'react';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const CDN_BASE_URL = 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist';
const CDN_ASSET_PATHS = [`${CDN_BASE_URL}/assets/`, `${CDN_BASE_URL}/`];
const CDN_SCRIPT_URL = `${CDN_BASE_URL}/dice-box.min.js`;
const CDN_MODULE_CANDIDATES = [
  `${CDN_BASE_URL}/dice-box.es.min.js`,
  `${CDN_BASE_URL}/dice-box.es.js`,
];
const DEFAULT_THROW_FORCE = 2.6;
const DEFAULT_FALLBACK_COLOR = '#2a52be';
const SIMPLE_STAGE_CLASS = 'damage-roller__dice-stage--simple';
const SIMPLE_CONTAINER_CLASS = 'damage-roller__simple-container';
const SIMPLE_DIE_CLASS = 'damage-roller__simple-die';

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

const scriptLoaders = new Map();

const parseNotationToEntries = (notation) => {
  if (typeof notation !== 'string') {
    return [];
  }

  const entries = [];
  const pattern = /(\d*)d(\d+)/gi;
  let match = pattern.exec(notation);

  while (match) {
    const qty = match[1] ? Number(match[1]) : 1;
    const sides = Number(match[2]);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(sides) && sides > 1) {
      entries.push({ type: `d${Math.round(sides)}`, qty: Math.round(qty) });
    }
    match = pattern.exec(notation);
  }

  return entries;
};

const expandEntriesToResults = (entries = [], forcedResults = null) => {
  const results = [];
  let forcedIndex = 0;
  const normalizedForced = Array.isArray(forcedResults)
    ? forcedResults.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : null;

  entries.forEach((entry) => {
    const qty = Number.isFinite(entry?.qty) ? Math.max(0, Math.round(entry.qty)) : 0;
    const typeMatch = typeof entry?.type === 'string' ? /d(\d+)/i.exec(entry.type) : null;
    const sides = typeMatch ? Number(typeMatch[1]) : Number(entry?.sides);
    if (!Number.isFinite(sides) || sides <= 1 || qty === 0) {
      return;
    }

    for (let index = 0; index < qty; index += 1) {
      let value = Array.isArray(entry?.values) ? Number(entry.values[index]) : null;
      if (!Number.isFinite(value) && normalizedForced && forcedIndex < normalizedForced.length) {
        value = normalizedForced[forcedIndex];
        forcedIndex += 1;
      }
      if (!Number.isFinite(value)) {
        value = Math.floor(Math.random() * sides) + 1;
      }
      if (Number.isFinite(value)) {
        results.push({ value, sides });
      }
    }
  });

  return results;
};

const createSimpleDiceBox = (target) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const stageElement =
    typeof Element !== 'undefined' && target instanceof Element
      ? target
      : typeof target === 'object' && target !== null && 'current' in target
      ? target.current
      : null;

  if (!stageElement || !(stageElement instanceof Element)) {
    return null;
  }

  const container = document.createElement('div');
  container.className = SIMPLE_CONTAINER_CLASS;
  stageElement.appendChild(container);
  stageElement.classList.add(SIMPLE_STAGE_CLASS);
  stageElement.dataset.simpleDiceBox = 'true';

  let currentColor = DEFAULT_FALLBACK_COLOR;
  const preferences = { theme: { primary: currentColor, foreground: currentColor } };
  const config = { theme: { primary: currentColor, foreground: currentColor } };

  const applyColor = (color) => {
    const normalized = typeof color === 'string' && color.trim() !== '' ? color.trim() : null;
    currentColor = normalized || DEFAULT_FALLBACK_COLOR;
    stageElement.style.setProperty('--dice-box-primary-color', currentColor);
    container.style.setProperty('--simple-dice-box-color', currentColor);
    preferences.theme = {
      ...(preferences.theme || {}),
      primary: currentColor,
      foreground: currentColor,
    };
    config.theme = {
      ...(config.theme || {}),
      primary: currentColor,
      foreground: currentColor,
    };
  };

  applyColor(DEFAULT_FALLBACK_COLOR);

  const clear = () => {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };

  const roll = async (input, options = {}) => {
    const entries = Array.isArray(input) ? input : parseNotationToEntries(input);
    const results = expandEntriesToResults(entries, options?.result);

    clear();

    if (results.length === 0) {
      return undefined;
    }

    results.forEach(({ value, sides }) => {
      const die = document.createElement('div');
      die.className = SIMPLE_DIE_CLASS;
      die.textContent = Number(value).toString();
      die.dataset.sides = `d${Number(sides)}`;
      container.appendChild(die);
    });

    return { values: results.map((result) => result.value), entries: results };
  };

  const destroy = () => {
    clear();
    if (container.parentNode === stageElement) {
      stageElement.removeChild(container);
    }
    stageElement.classList.remove(SIMPLE_STAGE_CLASS);
    stageElement.style.removeProperty('--dice-box-primary-color');
    container.style.removeProperty('--simple-dice-box-color');
    delete stageElement.dataset.simpleDiceBox;
  };

  const updateTheme = (theme = {}) => {
    if (typeof theme?.primary === 'string') {
      applyColor(theme.primary);
    } else if (typeof theme?.foreground === 'string') {
      applyColor(theme.foreground);
    }
  };

  return {
    init: async () => {},
    show: () => {},
    clear,
    roll,
    resize: () => {},
    destroy,
    updateConfig: ({ theme } = {}) => updateTheme(theme),
    setDiceColor: (color) => applyColor(color),
    preferences,
    config,
  };
};

function loadScriptOnce(url) {
  if (scriptLoaders.has(url)) {
    return scriptLoaders.get(url);
  }

  const loader = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Document unavailable when attempting to load script.'));
      return;
    }

    const existing = Array.from(document.querySelectorAll('script')).find(
      (script) => script.src === url
    );

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      const handleLoad = () => resolve();
      const handleError = () => reject(new Error(`Failed to load script: ${url}`));

      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.loaded = 'false';
    const handleLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const handleError = () => {
      reject(new Error(`Failed to load script: ${url}`));
    };
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    scriptLoaders.delete(url);
    throw error;
  });

  scriptLoaders.set(url, loader);
  return loader;
}

async function loadDiceBoxFromCdnScript() {
  if (typeof window === 'undefined') {
    throw new Error('Window unavailable when attempting to load DiceBox from CDN script.');
  }

  await loadScriptOnce(CDN_SCRIPT_URL);

  const DiceBoxGlobal =
    typeof window.DiceBox === 'function'
      ? window.DiceBox
      : typeof window.DiceBox?.DiceBox === 'function'
      ? window.DiceBox.DiceBox
      : typeof window.DiceBox?.default === 'function'
      ? window.DiceBox.default
      : null;

  if (typeof DiceBoxGlobal !== 'function') {
    throw new Error('DiceBox global constructor not found after loading CDN script.');
  }

  return { DiceBox: DiceBoxGlobal, default: DiceBoxGlobal };
}

let diceBoxModulePromise = null;

async function importDiceBoxFromCdnModule() {
  let lastError;
  for (const url of CDN_MODULE_CANDIDATES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const module = await import(/* webpackIgnore: true */ url);
      if (module?.DiceBox || module?.default) {
        return module;
      }
      lastError = new Error('DiceBox CDN module did not provide an export.');
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Unable to import DiceBox from CDN module candidates.');
}

async function loadDiceBoxModule() {
  if (!diceBoxModulePromise) {
    diceBoxModulePromise = (async () => {
      try {
        return await import('@3d-dice/dice-box');
      } catch (localError) {
        console.warn('Failed to load local DiceBox bundle, attempting CDN module', localError);
        try {
          return await importDiceBoxFromCdnModule();
        } catch (cdnError) {
          console.warn('DiceBox CDN module import failed, attempting script fallback', cdnError);
          try {
            return await loadDiceBoxFromCdnScript();
          } catch (cdnScriptError) {
            const error = new Error('Unable to load DiceBox from local package, CDN module, or CDN script.');
            error.cause = cdnScriptError;
            throw error;
          }
        }
      }
    })();
  }

  return diceBoxModulePromise;
}

async function createDiceBoxInstance(DiceBoxCtor, target, assetPath) {
  const resolvedTarget =
    typeof Element !== 'undefined' && target instanceof Element
      ? target
      : typeof target === 'object' && target !== null && 'current' in target
      ? target.current
      : null;

  const targetElement =
    typeof Element !== 'undefined' && resolvedTarget instanceof Element ? resolvedTarget : null;

  if (!targetElement) {
    throw new Error('DiceBox target element unavailable.');
  }

  const instance = new DiceBoxCtor(targetElement, {
    assetPath,
    theme: 'default',
    sounds: false,
    gravity: { x: 0, y: 0, z: -9.81 },
    throwForce: DEFAULT_THROW_FORCE,
  });
  if (typeof instance?.init === 'function') {
    await instance.init();
  }
  if (typeof instance?.show === 'function') {
    try {
      instance.show();
    } catch (error) {
      console.warn('DiceBox show call failed', error);
    }
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

      const rect = typeof target.getBoundingClientRect === 'function'
        ? target.getBoundingClientRect()
        : { width: 0, height: 0 };
      const fallbackWidth = Math.max(target.offsetWidth || 0, target.clientWidth || 0);
      const fallbackHeight = Math.max(target.offsetHeight || 0, target.clientHeight || 0);
      const width = Math.max(rect.width || 0, fallbackWidth);
      const height = Math.max(rect.height || 0, fallbackHeight);

      if ((width === 0 && height === 0) && !cancelled) {
        frame = requestAnimationFrame(initialize);
        return;
      }

      try {
        const module = await loadDiceBoxModule();
        const DiceBoxCtor = module?.DiceBox || module?.default;
        if (!DiceBoxCtor) {
          throw new Error('DiceBox constructor export not found.');
        }

        const publicUrl = typeof process !== 'undefined' ? process.env?.PUBLIC_URL : undefined;
        const baseLocalAssetPath = `${publicUrl || ''}/dice-box`;
        const localAssetCandidates = [
          `${baseLocalAssetPath}/assets/`,
          `${baseLocalAssetPath}/`,
        ]
          .map((candidate) => (candidate ? `${candidate.replace(/\/?$/, '')}/` : null))
          .filter(Boolean);
        const assetCandidates = [...CDN_ASSET_PATHS, ...localAssetCandidates];

        let lastError;

        for (const assetPath of assetCandidates) {
          try {
            diceBoxInstance = await createDiceBoxInstance(DiceBoxCtor, target, assetPath);
            if (typeof diceBoxInstance?.resize === 'function') {
              try {
                diceBoxInstance.resize();
              } catch (resizeError) {
                console.warn('DiceBox resize after init failed', resizeError);
              }
            }
            break;
          } catch (error) {
            console.warn('DiceBox init failed for asset path', assetPath, error);
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
        if (!cancelled) {
          diceBoxInstance = createSimpleDiceBox(target);
          if (diceBoxInstance) {
            diceBoxRef.current = diceBoxInstance;
            setIsReady(true);
            return;
          }
        }
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
