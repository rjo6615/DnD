const ASSET_PATH = `${
  (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) || ''
}/assets/dice-box/`;

const DEFAULT_DICE_BOX_SRC =
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.0.5/dist/dice-box.min.js';

let modulePromise = null;
let diceBoxPromise = null;
let diceBoxInstance = null;
let diceBoxReady = false;
let diceBoxFailed = false;
let hostElement = null;
let rollQueue = Promise.resolve();
let generatedHostId = 0;
let diceBoxScriptPromise = null;

const availabilityListeners = new Set();

const fallbackRoll = (count, sides) =>
  Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);

const safeNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const notifyAvailability = (ready) => {
  availabilityListeners.forEach((listener) => {
    try {
      listener(ready);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Dice box listener error', error);
    }
  });
};

const setAvailability = (ready) => {
  diceBoxReady = ready;
  notifyAvailability(ready);
};

const resolveHostReference = () => {
  if (!hostElement) {
    return null;
  }

  if (typeof hostElement === 'string') {
    return hostElement;
  }

  if (typeof hostElement === 'object') {
    if ('current' in hostElement) {
      return hostElement.current || null;
    }

    if (typeof hostElement.nodeType === 'number') {
      return hostElement;
    }
  }

  return null;
};

const ensureElementSelector = (element) => {
  if (!element || typeof element !== 'object') {
    return null;
  }

  const existingId =
    typeof element.id === 'string' && element.id.trim() ? element.id.trim() : null;
  if (existingId) {
    return `#${existingId}`;
  }

  generatedHostId += 1;
  const generatedId = `damage-dice-box-${generatedHostId}`;

  try {
    element.id = generatedId;
  } catch (error) {
    return null;
  }

  return `#${generatedId}`;
};

const resolveDiceBoxTarget = () => {
  const reference = resolveHostReference();
  if (!reference) {
    return { element: null, selector: null };
  }

  if (typeof reference === 'string') {
    const element =
      typeof document !== 'undefined' && document
        ? document.querySelector(reference)
        : null;
    return { element, selector: reference };
  }

  const selector = ensureElementSelector(reference);
  return { element: reference, selector };
};

const resolveGlobalDiceBox = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const globalDiceBox = window.DiceBox || window.__DiceBox;
  return typeof globalDiceBox === 'function' ? globalDiceBox : null;
};

const getDiceBoxScriptSource = () => {
  const envSource =
    typeof process !== 'undefined' && process.env && process.env.REACT_APP_DICE_BOX_SRC;
  if (typeof envSource === 'string' && envSource.trim()) {
    return envSource.trim();
  }

  if (typeof window !== 'undefined') {
    const globalSource =
      (typeof window.__DICE_BOX_SRC === 'string' && window.__DICE_BOX_SRC.trim()) ||
      (typeof window.__DiceBoxSource === 'string' && window.__DiceBoxSource.trim());
    if (globalSource) {
      return globalSource;
    }
  }

  return DEFAULT_DICE_BOX_SRC;
};

const loadDiceBoxScript = () => {
  if (diceBoxScriptPromise) {
    return diceBoxScriptPromise;
  }

  diceBoxScriptPromise = new Promise((resolve, reject) => {
    const existingCtor = resolveGlobalDiceBox();
    if (existingCtor) {
      resolve(existingCtor);
      return;
    }

    if (typeof document === 'undefined') {
      reject(new Error('Dice box script requires a browser environment'));
      return;
    }

    const scriptSrc = getDiceBoxScriptSource();
    const selector = `script[data-dice-box-src="${scriptSrc}"]`;
    const root = document.head || document.body || document.documentElement;

    if (!root) {
      reject(new Error('Dice box script could not be injected into the document'));
      return;
    }

    const attachListeners = (script, removeOnError) => {
      const cleanup = () => {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      };

      function handleLoad() {
        cleanup();
        const ctor = resolveGlobalDiceBox();
        if (ctor) {
          resolve(ctor);
          return;
        }
        reject(new Error('Dice box script loaded without exposing DiceBox'));
      }

      function handleError() {
        cleanup();
        if (removeOnError && typeof script.remove === 'function') {
          script.remove();
        }
        reject(new Error('Failed to load dice box script'));
      }

      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    };

    const existingScript = document.querySelector(selector);
    if (existingScript) {
      attachListeners(existingScript, false);
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = scriptSrc;
    script.dataset.diceBoxSrc = scriptSrc;
    attachListeners(script, true);
    root.appendChild(script);
  }).catch((error) => {
    diceBoxScriptPromise = null;
    throw error;
  });

  return diceBoxScriptPromise;
};

const getDiceBoxConstructor = () => {
  if (modulePromise) {
    return modulePromise;
  }

  modulePromise = (async () => {
    const existingCtor = resolveGlobalDiceBox();
    if (existingCtor) {
      return existingCtor;
    }

    const loadedCtor = await loadDiceBoxScript();
    if (typeof loadedCtor !== 'function') {
      throw new Error('Dice box constructor was not available after loading script');
    }

    return loadedCtor;
  })().catch((error) => {
    modulePromise = null;
    throw error;
  });

  return modulePromise;
};

const resetInstance = () => {
  diceBoxInstance = null;
  diceBoxPromise = null;
  diceBoxReady = false;
  usingDiceBoxStub = false;
};

const ensureDiceBox = async () => {
  if (diceBoxInstance) {
    return diceBoxInstance;
  }
  if (diceBoxFailed) {
    return null;
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    diceBoxFailed = true;
    return null;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const { element: targetElement, selector } = resolveDiceBoxTarget();
  if (!targetElement && !selector) {
    return null;
  }
  if (!diceBoxPromise) {
    diceBoxPromise = (async () => {
      try {
        const DiceBox = await getDiceBoxConstructor();
        const target = targetElement || selector;
        if (!target) {
          throw new Error('Dice box target was not available');
        }

        const options = {
          assetPath: ASSET_PATH,
          theme: 'default',
          scale: 6,
          offscreen: false,
        };

        let instance = null;

        try {
          instance = new DiceBox(target, options);
        } catch (error) {
          if (selector && target !== selector) {
            instance = new DiceBox(selector, options);
          } else {
            throw error;
          }
        }

        await instance.init();
        diceBoxInstance = instance;
        diceBoxFailed = false;
        setAvailability(!usingDiceBoxStub);
        return instance;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Dice box initialization failed', error);
        diceBoxFailed = true;
        setAvailability(false);
        return null;
      }
    })();
  }
  return diceBoxPromise;
};

const collectNumericLeaves = (node, target) => {
  if (!node) return;

  const addNumber = (value) => {
    const num = safeNumber(value);
    if (num !== null) {
      target.push(num);
    }
  };

  if (Array.isArray(node)) {
    node.forEach((entry) => collectNumericLeaves(entry, target));
    return;
  }

  if (typeof node !== 'object') {
    addNumber(node);
    return;
  }

  const {
    results,
    values,
    rolls,
    dice,
    value,
    result,
    total,
  } = node;

  let traversed = false;

  if (Array.isArray(results) && results.length > 0) {
    traversed = true;
    collectNumericLeaves(results, target);
  }

  if (Array.isArray(values) && values.length > 0) {
    traversed = true;
    collectNumericLeaves(values, target);
  }

  if (Array.isArray(rolls) && rolls.length > 0) {
    traversed = true;
    rolls.forEach((roll) => collectNumericLeaves(roll, target));
  }

  if (Array.isArray(dice) && dice.length > 0) {
    traversed = true;
    dice.forEach((die) => collectNumericLeaves(die, target));
  }

  if (!traversed) {
    addNumber(value);
    addNumber(result);
    addNumber(total);
  }
};

const extractRollValues = (roll) => {
  const numbers = [];
  collectNumericLeaves(roll, numbers);
  return numbers;
};

const normalizeResultGroups = (rawResults) => {
  if (!rawResults) return [];
  if (Array.isArray(rawResults)) {
    return rawResults;
  }
  if (Array.isArray(rawResults.groups)) {
    return rawResults.groups;
  }
  return [rawResults];
};

const parseDiceBoxResults = (rawResults, requests) => {
  const groups = normalizeResultGroups(rawResults);
  if (!Array.isArray(groups) || groups.length === 0) {
    return null;
  }

  const extracted = [];

  groups.forEach((group) => {
    if (!group) return;
    if (Array.isArray(group.rolls) && group.rolls.length > 0) {
      group.rolls.forEach((roll) => {
        const values = extractRollValues(roll);
        if (values.length > 0) {
          extracted.push(values);
        }
      });
      return;
    }

    const values = extractRollValues(group);
    if (values.length > 0) {
      extracted.push(values);
    }
  });

  if (extracted.length === 0) {
    return null;
  }

  if (extracted.length !== requests.length) {
    // Attempt to coerce the extracted values into the expected request shape.
    let index = 0;
    const coerced = requests.map(({ count }) => {
      const values = extracted[index] || [];
      index += 1;
      if (typeof count === 'number' && count > 0) {
        if (values.length > count) {
          return values.slice(0, count);
        }
        if (values.length < count) {
          return values.concat(Array(count - values.length).fill(0)).slice(0, count);
        }
      }
      return values;
    });

    return coerced;
  }

  return extracted.map((values, index) => {
    const expected = requests[index]?.count;
    if (typeof expected === 'number' && expected > 0 && values.length !== expected) {
      if (values.length > expected) {
        return values.slice(0, expected);
      }
      if (values.length < expected) {
        return values.concat(Array(expected - values.length).fill(0)).slice(0, expected);
      }
    }
    return values;
  });
};

const setRollHandlers = (instance, onComplete, onError) => {
  if (!instance) return () => {};

  const cleanup = () => {
    instance.onRollComplete = null;
    if ('onRollError' in instance) {
      instance.onRollError = null;
    }
  };

  instance.onRollComplete = (results) => {
    cleanup();
    onComplete(results);
  };

  if ('onRollError' in instance) {
    instance.onRollError = (error) => {
      cleanup();
      onError(error);
    };
  }

  return cleanup;
};

export const registerDiceBoxContainer = (element) => {
  hostElement = element || null;
  resetInstance();
  diceBoxFailed = false;
  const { element: resolvedElement, selector } = resolveDiceBoxTarget();
  if (!resolvedElement && !selector) {
    setAvailability(false);
    return () => {};
  }

  ensureDiceBox();

  return () => {
    if (hostElement === element) {
      hostElement = null;
      resetInstance();
      setAvailability(false);
    }
  };
};

export const subscribeToDiceBoxAvailability = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }
  availabilityListeners.add(listener);
  listener(diceBoxReady);
  return () => {
    availabilityListeners.delete(listener);
  };
};

export const isDiceBoxReady = () => diceBoxReady;

export const rollDiceWithBox = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return Promise.resolve({
      rolls: [],
      rawResults: null,
      usedFallback: true,
    });
  }

  const executeRoll = async () => {
    const instance = await ensureDiceBox();
    const fallback = requests.map(({ count, sides }) => fallbackRoll(count, sides));

    if (!instance) {
      return {
        rolls: fallback,
        rawResults: null,
        usedFallback: true,
      };
    }

    return new Promise((resolve) => {
      const notations = requests.map(({ count, sides }) => `${count}d${sides}`);

      try {
        if (typeof instance.clear === 'function') {
          instance.clear();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Dice box clear failed', error);
      }

      const finalize = (rawResults, usedFallback = false) => {
        resolve({
          rolls: usedFallback ? fallback : rawResults,
          rawResults: usedFallback ? null : rawResults,
          usedFallback,
        });
      };

      const cleanup = setRollHandlers(
        instance,
        (rawResults) => {
          const parsed = parseDiceBoxResults(rawResults, requests);
          if (parsed) {
            resolve({ rolls: parsed, rawResults, usedFallback: false });
            return;
          }
          resolve({ rolls: fallback, rawResults, usedFallback: true });
        },
        () => {
          finalize(fallback, true);
        }
      );

      try {
        instance.roll(notations);
      } catch (error) {
        cleanup();
        // eslint-disable-next-line no-console
        console.error('Dice box roll failed', error);
        finalize(fallback, true);
      }
    });
  };

  rollQueue = rollQueue.then(executeRoll, executeRoll);
  return rollQueue;
};

export default {
  registerDiceBoxContainer,
  subscribeToDiceBoxAvailability,
  isDiceBoxReady,
  rollDiceWithBox,
};
