const ASSET_PATH = `${
  (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) || ''
}/assets/dice-box/`;

const BASE_CONFIG = Object.freeze({
  assetPath: ASSET_PATH,
  theme: 'default',
  scale: 6,
  offscreen: false,
});

let modulePromise = null;
let diceBoxPromise = null;
let diceBoxInstance = null;
let diceBoxReady = false;
let diceBoxFailed = false;
let diceBoxDisabled = false;
let hostElement = null;
let rollQueue = Promise.resolve();
let generatedHostId = 0;
let pendingThemeColor = null;
let activeThemeColor = null;
let warmupPromise = null;
let retryTimeoutId = null;

const DICEBOX_INIT_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 4000;

const clearScheduledRetry = () => {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
};

const scheduleRetry = () => {
  if (retryTimeoutId || diceBoxDisabled) {
    return;
  }

  retryTimeoutId = setTimeout(() => {
    retryTimeoutId = null;
    if (!diceBoxReady && !diceBoxDisabled) {
      ensureDiceBox();
    }
  }, RETRY_DELAY_MS);
};

const availabilityListeners = new Set();

const MIN_ROLL_VALUE = 1;

const fallbackRoll = (count, sides) =>
  Array.from({ length: count }, () => Math.floor(Math.random() * sides) + MIN_ROLL_VALUE);

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

const withTimeout = (promise, timeoutMs, errorFactory) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(errorFactory?.() || new Error('Operation timed out'));
    }, timeoutMs);

    const finalize = (callback) => (value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      callback(value);
    };

    promise.then(finalize(resolve), finalize(reject));
  });

const markDiceBoxFailure = ({ fatal = false } = {}) => {
  diceBoxFailed = true;
  if (fatal) {
    diceBoxDisabled = true;
  }

  resetInstance();
  setAvailability(false);
  if (!fatal) {
    scheduleRetry();
  }
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

const getDiceBoxConstructor = () => {
  if (modulePromise) {
    return modulePromise;
  }

  modulePromise = import(/* webpackChunkName: "dice-box" */ '@3d-dice/dice-box')
    .then((module) => {
      const DiceBoxCtor = module?.default || module?.DiceBox || module;
      if (typeof DiceBoxCtor !== 'function') {
        throw new Error('Dice Box module did not export a constructor');
      }
      return DiceBoxCtor;
    })
    .catch((error) => {
      modulePromise = null;
      throw error;
    });

  return modulePromise;
};

const destroyInstance = (instance) => {
  if (!instance) {
    return;
  }

  try {
    if (typeof instance.destroy === 'function') {
      instance.destroy();
    } else if (typeof instance.dispose === 'function') {
      instance.dispose();
    }
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Dice box destroy failed', error);
    }
  }
};

const resetInstance = () => {
  if (diceBoxInstance) {
    destroyInstance(diceBoxInstance);
  }

  diceBoxInstance = null;
  diceBoxPromise = null;
  diceBoxReady = false;
  activeThemeColor = null;
  clearScheduledRetry();
};

const normalizeThemeColor = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) {
    return null;
  }

  return `#${match[1].toLowerCase()}`;
};

const createDiceBoxConfig = (overrides = null) => ({
  ...BASE_CONFIG,
  ...(overrides && typeof overrides === 'object' ? overrides : {}),
});

const buildThemeConfig = (color) => (color ? { themeColor: color } : {});

const applyThemeColorToInstance = (instance, color) => {
  if (!instance || typeof instance.updateConfig !== 'function') {
    return false;
  }

  if (color === activeThemeColor) {
    return true;
  }

  try {
    instance.updateConfig(buildThemeConfig(color));
    activeThemeColor = color || null;
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Dice box theme color update failed', error);
  }

  return false;
};

const applyPendingThemeColor = (instance) => {
  if (!instance || !pendingThemeColor) {
    return;
  }

  if (applyThemeColorToInstance(instance, pendingThemeColor)) {
    pendingThemeColor = null;
  }
};

async function ensureDiceBox() {
  if (diceBoxInstance) {
    return diceBoxInstance;
  }

  if (diceBoxDisabled) {
    return null;
  }

  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    markDiceBoxFailure({ fatal: true });
    return null;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const { element: targetElement, selector } = resolveDiceBoxTarget();
  if (!targetElement && !selector) {
    scheduleRetry();
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

        const options = createDiceBoxConfig(
          pendingThemeColor ? { themeColor: pendingThemeColor } : null,
        );

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

        await withTimeout(
          instance.init(),
          DICEBOX_INIT_TIMEOUT_MS,
          () => new Error('Dice box initialization timed out'),
        );
        diceBoxInstance = instance;
        diceBoxFailed = false;
        diceBoxDisabled = false;
        applyPendingThemeColor(instance);
        clearScheduledRetry();
        setAvailability(true);
        return instance;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Dice box initialization failed', error);
        markDiceBoxFailure();
        return null;
      }
    })();
  }
  return diceBoxPromise;
}

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

  if (!Array.isArray(requests) || requests.length === 0) {
    return extracted;
  }

  const normalizedRequests = requests.map((request) => {
    const count = Math.max(0, Math.floor(Number(request?.count) || 0));
    const rawSides = Number(request?.sides);
    const sides = Number.isFinite(rawSides) && rawSides > 0 ? Math.round(rawSides) : null;
    return { count, sides };
  });

  const valueQueue = [];
  extracted.forEach((values) => {
    if (Array.isArray(values)) {
      values.forEach((value) => {
        const numeric = safeNumber(value);
        if (numeric !== null) {
          valueQueue.push(numeric);
        }
      });
    }
  });

  if (valueQueue.length === 0) {
    return null;
  }

  let queueIndex = 0;
  const parsedGroups = normalizedRequests.map(({ count, sides }) => {
    if (!count) {
      return [];
    }

    const upperBound = Number.isInteger(sides) ? sides : null;
    const group = [];

    while (queueIndex < valueQueue.length && group.length < count) {
      const candidate = valueQueue[queueIndex];
      queueIndex += 1;

      if (
        upperBound !== null &&
        (candidate < MIN_ROLL_VALUE || candidate > upperBound)
      ) {
        continue;
      }

      group.push(candidate);
    }

    return group.length === count ? group : null;
  });

  const hasValidGroup = parsedGroups.some(
    (group) => Array.isArray(group) && group.length > 0
  );

  return hasValidGroup ? parsedGroups : null;
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
  diceBoxDisabled = false;
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

export const hasDiceBoxFailed = () => diceBoxFailed;

export const warmupDiceBox = () => {
  if (diceBoxInstance) {
    return Promise.resolve(diceBoxInstance);
  }

  if (diceBoxPromise) {
    return diceBoxPromise.catch(() => null);
  }

  if (warmupPromise) {
    return warmupPromise;
  }

  const pending = getDiceBoxConstructor()
    .then(() => null)
    .catch((error) => {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('Dice box warmup failed', error);
      }
      return null;
    });

  warmupPromise = pending;

  return pending.finally(() => {
    if (warmupPromise === pending) {
      warmupPromise = null;
    }
  });
};

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

      const finalize = (rawResults, usedFallback = false, { failure = false } = {}) => {
        if (failure) {
          markDiceBoxFailure();
        }

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
          finalize(fallback, true, { failure: true });
        },
        () => {
          finalize(fallback, true, { failure: true });
        }
      );

      try {
        instance.roll(notations);
      } catch (error) {
        cleanup();
        // eslint-disable-next-line no-console
        console.error('Dice box roll failed', error);
        finalize(fallback, true, { failure: true });
      }
    });
  };

  rollQueue = rollQueue.then(executeRoll, executeRoll);
  return rollQueue;
};

export const setDiceBoxThemeColor = (color) => {
  const normalized = normalizeThemeColor(color);
  if (!normalized) {
    pendingThemeColor = null;
    activeThemeColor = null;
    return;
  }

  if (normalized === activeThemeColor) {
    pendingThemeColor = null;
    return;
  }

  pendingThemeColor = normalized;

  if (diceBoxInstance) {
    applyPendingThemeColor(diceBoxInstance);
  }
};

export default {
  registerDiceBoxContainer,
  subscribeToDiceBoxAvailability,
  isDiceBoxReady,
  hasDiceBoxFailed,
  rollDiceWithBox,
  setDiceBoxThemeColor,
};
