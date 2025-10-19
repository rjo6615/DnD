const ASSET_PATH = '/assets/dice-box/';

let modulePromise = null;
let diceBoxPromise = null;
let diceBoxInstance = null;
let diceBoxReady = false;
let diceBoxFailed = false;
let hostElement = null;
let rollQueue = Promise.resolve();

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

const resetInstance = () => {
  diceBoxInstance = null;
  diceBoxPromise = null;
  diceBoxReady = false;
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
  if (!hostElement) {
    return null;
  }
  if (!diceBoxPromise) {
    diceBoxPromise = (async () => {
      try {
        const DiceBox = await getDiceBoxConstructor();
        const target =
          hostElement && typeof hostElement === 'object' && 'current' in hostElement
            ? hostElement.current
            : hostElement;
        const instance = new DiceBox(target || hostElement, {
          assetPath: ASSET_PATH,
          theme: 'default',
          scale: 6,
          offscreen: false,
        });
        await instance.init();
        diceBoxInstance = instance;
        diceBoxFailed = false;
        setAvailability(true);
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

const parseDiceBoxResults = (rawResults, requests) => {
  if (!Array.isArray(rawResults) || rawResults.length === 0) {
    return null;
  }

  const extracted = [];

  const pushValues = (values) => {
    if (!Array.isArray(values) || values.length === 0) {
      return;
    }
    const numbers = values
      .map((value) => {
        if (Array.isArray(value)) {
          return value
            .map((nested) => safeNumber(nested?.value ?? nested?.result ?? nested))
            .filter((num) => num !== null);
        }
        if (value && typeof value === 'object') {
          const num =
            safeNumber(value.value) ?? safeNumber(value.result) ?? safeNumber(value.total);
          return num !== null ? [num] : [];
        }
        const num = safeNumber(value);
        return num !== null ? [num] : [];
      })
      .flat();
    if (numbers.length > 0) {
      extracted.push(numbers);
    }
  };

  const traverse = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    if (typeof node !== 'object') return;

    if (Array.isArray(node.results)) {
      pushValues(node.results);
    }
    if (Array.isArray(node.rolls)) {
      node.rolls.forEach((roll) => {
        if (Array.isArray(roll.results)) {
          pushValues(roll.results);
        } else if (Array.isArray(roll.values)) {
          pushValues(roll.values);
        } else if (typeof roll.value === 'number') {
          pushValues([roll.value]);
        }
      });
    }
    if (Array.isArray(node.values)) {
      pushValues(node.values);
    }
  };

  rawResults.forEach(traverse);

  if (extracted.length === requests.length) {
    return extracted.map((values, index) => {
      const expected = requests[index]?.count;
      if (typeof expected === 'number' && expected > 0 && values.length !== expected) {
        return values.slice(0, expected);
      }
      return values;
    });
  }

  return null;
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
  if (!hostElement) {
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
