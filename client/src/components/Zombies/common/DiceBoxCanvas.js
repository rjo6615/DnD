import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

const DEFAULT_DICE_BOX_MODULE_URL =
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1/dist/dice-box.esm.min.js';
const DEFAULT_DICE_BOX_ASSET_PATH =
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1/dist/assets/';
const DEFAULT_DICE_COLOR = '#3366ff';

const diceBoxModuleCache = {
  promise: null,
};

const readRuntimeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

const sanitizeAssetPath = (value) => {
  const runtimeValue = readRuntimeString(value);
  if (!runtimeValue) {
    return '';
  }

  return runtimeValue.endsWith('/') ? runtimeValue : `${runtimeValue}/`;
};

const resolveDefaultAssetPath = () => {
  const envValue = sanitizeAssetPath(process.env.REACT_APP_DICE_BOX_ASSET_PATH);
  if (envValue) {
    return envValue;
  }

  if (typeof window !== 'undefined') {
    const windowValue = sanitizeAssetPath(window.__DICE_BOX_ASSET_PATH__);
    if (windowValue) {
      return windowValue;
    }
  }

  return DEFAULT_DICE_BOX_ASSET_PATH;
};

const resolveConfiguredModuleUrls = () => {
  const urls = [];
  const envValue = readRuntimeString(process.env.REACT_APP_DICE_BOX_MODULE_URL);
  if (envValue) {
    urls.push(envValue);
  }

  if (typeof window !== 'undefined') {
    const windowValue = readRuntimeString(window.__DICE_BOX_MODULE_URL__);
    if (windowValue) {
      urls.push(windowValue);
    }
  }

  return urls;
};

const resolveGlobalDiceBoxCtor = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const ctor = window.DiceBox || window.diceBox || null;
  return typeof ctor === 'function' ? ctor : null;
};

const loadExternalModule = async (url) =>
  import(/* webpackIgnore: true */ url);

const loadDiceBoxModuleFromSources = async () => {
  const globalCtor = resolveGlobalDiceBoxCtor();
  if (globalCtor) {
    return { DiceBox: globalCtor, default: globalCtor };
  }

  const urls = [
    ...new Set([...resolveConfiguredModuleUrls(), DEFAULT_DICE_BOX_MODULE_URL]),
  ];

  for (const url of urls) {
    try {
      const module = await loadExternalModule(url);
      if (module) {
        return module;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load DiceBox module from ${url}`, error);
    }
  }

  const attemptedSources = urls
    .map((url) => `- ${url}`)
    .join('\n');

  throw new Error(
    `Unable to load DiceBox module from the available sources.\nAttempted sources:\n${attemptedSources}`
  );
};

const normalizeColor = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_DICE_COLOR;
  }

  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
    return `#${trimmed.slice(1).toLowerCase()}`;
  }

  return DEFAULT_DICE_COLOR;
};

const toDieSides = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
};

const sanitizeExpression = (expression) => {
  if (typeof expression !== 'string') {
    return '';
  }

  return expression
    .replace(/\s+/g, '')
    .replace(/[^0-9dD+-]/g, '')
    .toLowerCase();
};

const buildDiceNotation = (diceDetails) => {
  if (!Array.isArray(diceDetails) || diceDetails.length === 0) {
    return '';
  }

  const groups = new Map();
  diceDetails.forEach((die) => {
    const sides = toDieSides(die?.sides);
    if (sides > 0) {
      groups.set(sides, (groups.get(sides) || 0) + 1);
    }
  });

  if (!groups.size) {
    return '';
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([sides, count]) => `${count}d${sides}`)
    .join('+');
};

const loadDiceBoxModule = async () => {
  if (diceBoxModuleCache.promise) {
    return diceBoxModuleCache.promise;
  }

  diceBoxModuleCache.promise = loadDiceBoxModuleFromSources().catch(
    (error) => {
      diceBoxModuleCache.promise = null;
      throw error;
    }
  );

  return diceBoxModuleCache.promise;
};

const DiceBoxCanvas = forwardRef(
  (
    {
      className = '',
      style = {},
      diceColor,
      onReadyChange = () => {},
      assetPath,
      onRollComplete,
    },
    ref
  ) => {
    const containerRef = useRef(null);
    const diceBoxRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const elementId = useMemo(
      () => `dice-box-${Math.random().toString(36).slice(2, 11)}`,
      []
    );

    const normalizedColor = useMemo(
      () => normalizeColor(diceColor),
      [diceColor]
    );

    const resolvedAssetPath = useMemo(() => {
      const sanitizedPropPath = sanitizeAssetPath(assetPath);
      if (sanitizedPropPath) {
        return sanitizedPropPath;
      }

      return resolveDefaultAssetPath();
    }, [assetPath]);

    useEffect(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return undefined;
      }

      if (!('WebGLRenderingContext' in window)) {
        onReadyChange(false);
        return undefined;
      }

      let cancelled = false;

      const init = async () => {
        try {
          const module = await loadDiceBoxModule();
          if (cancelled) {
            return;
          }

          const DiceBoxCtor = module?.DiceBox || module?.default;
          if (typeof DiceBoxCtor !== 'function') {
            throw new Error('DiceBox constructor not available');
          }

          const target = containerRef.current;
          if (!target) {
            return;
          }

          const selector = `#${elementId}`;
          const baseOptions = {
            assetPath: resolvedAssetPath,
            theme: 'default',
            scale: 9,
            throwForce: 6,
            enableShadows: true,
            gravity: 9.81,
            element: selector,
            target: selector,
            container: target,
          };

          let diceBoxInstance = null;

          const instantiationAttempts = [
            () => new DiceBoxCtor(selector, baseOptions),
            () => new DiceBoxCtor(target, baseOptions),
            () =>
              new DiceBoxCtor({
                ...baseOptions,
                element: target,
                target,
              }),
          ];
          let lastInstantiationError = null;

          for (const attempt of instantiationAttempts) {
            try {
              diceBoxInstance = attempt();
              if (diceBoxInstance) {
                break;
              }
            } catch (attemptError) {
              diceBoxInstance = null;
              lastInstantiationError = attemptError;
            }
          }

          if (!diceBoxInstance) {
            try {
              diceBoxInstance = new DiceBoxCtor({
                ...baseOptions,
                element: selector,
                target: selector,
              });
            } catch (finalError) {
              // eslint-disable-next-line no-console
              console.error(
                'Failed to construct DiceBox with provided options',
                lastInstantiationError || finalError,
                finalError
              );
              throw finalError;
            }
          }

          diceBoxRef.current = diceBoxInstance;

          if (typeof diceBoxInstance.init === 'function') {
            await diceBoxInstance.init();
          }

          if (cancelled) {
            diceBoxInstance.destroy?.();
            diceBoxRef.current = null;
            return;
          }

          setIsReady(true);
          onReadyChange(true);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to initialize DiceBox', error);
          onReadyChange(false);
        }
      };

      init();

      return () => {
        cancelled = true;
        setIsReady(false);
        onReadyChange(false);
        if (diceBoxRef.current) {
          diceBoxRef.current.destroy?.();
          diceBoxRef.current = null;
        }
      };
    }, [elementId, onReadyChange, resolvedAssetPath]);

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }
      containerRef.current.style.setProperty(
        '--damage-dice-primary-color',
        normalizedColor
      );
    }, [normalizedColor]);

    useImperativeHandle(
      ref,
      () => ({
        roll(diceDetails = [], options = {}) {
          if (!diceBoxRef.current || !isReady) {
            return false;
          }

          const diceBoxInstance = diceBoxRef.current;
          const expression =
            sanitizeExpression(options.expression) ||
            buildDiceNotation(diceDetails);

          if (!expression) {
            return false;
          }

          try {
            const colorOverride = normalizeColor(
              options.diceColor || normalizedColor
            );

            if (
              typeof diceBoxInstance.updateColorset === 'function' &&
              colorOverride
            ) {
              diceBoxInstance.updateColorset({
                dice: colorOverride,
                label: '#ffffff',
                outline: '#000000',
              });
            }

            const result = diceBoxInstance.roll(expression);
            const completionHandlers = [];

            if (typeof onRollComplete === 'function') {
              completionHandlers.push(onRollComplete);
            }

            if (typeof options.onRollComplete === 'function') {
              completionHandlers.push(options.onRollComplete);
            }

            const invokeCompletionHandlers = (payload) => {
              completionHandlers.forEach((handler) => {
                try {
                  handler(payload);
                } catch (handlerError) {
                  // eslint-disable-next-line no-console
                  console.error('DiceBox roll completion handler failed', handlerError);
                }
              });
            };

            if (result && typeof result.then === 'function') {
              result
                .then((payload) => {
                  if (completionHandlers.length > 0) {
                    invokeCompletionHandlers(payload);
                  }
                  return payload;
                })
                .catch((error) => {
                  // eslint-disable-next-line no-console
                  console.error('DiceBox roll promise rejected', error);
                });
            } else if (completionHandlers.length > 0) {
              invokeCompletionHandlers(result);
            }
            return true;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('DiceBox roll failed', error);
            return false;
          }
        },
        isReady() {
          return isReady;
        },
        clear() {
          if (
            diceBoxRef.current &&
            typeof diceBoxRef.current.clear === 'function'
          ) {
            diceBoxRef.current.clear();
          }
        },
      }),
      [isReady, normalizedColor, onRollComplete]
    );

    return (
      <div
        ref={containerRef}
        id={elementId}
        className={`damage-roller__dice-box ${className}`.trim()}
        style={style}
        aria-hidden="true"
      />
    );
  }
);

DiceBoxCanvas.displayName = 'DiceBoxCanvas';

export default DiceBoxCanvas;
