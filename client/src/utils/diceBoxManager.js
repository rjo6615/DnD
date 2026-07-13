const ASSET_PATH = `${
  (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) || ''
}/assets/dice-box/`;

export const DICE_BOX_THEMES = Object.freeze([
  'default',
  'rust',
  'diceOfRolling',
  'gemstone',
  'wooden',
  'smooth',
  'rock',
  'blueGreenMetal',
]);

export const DEFAULT_DICE_THEME = DICE_BOX_THEMES[0];

const BASE_CONFIG = Object.freeze({
  assetPath: ASSET_PATH,
  theme: DEFAULT_DICE_THEME,
  scale: 6,
  offscreen: false,
  spinForce: 24,
  throwForce: 10,
  gravity: .7,
});

let modulePromise = null;
let diceBoxPromise = null;
let diceBoxInstance = null;
let diceBoxReady = false;
let diceBoxFailed = false;
let diceBoxDisabled = false;
let workerSupportState = 'unknown';
let workerSupportLogged = false;
let hostElement = null;
let rollQueue = Promise.resolve();
let generatedHostId = 0;
let pendingThemeColor = null;
let activeThemeColor = null;
let pendingThemeName = null;
let activeThemeName = DEFAULT_DICE_THEME;
let warmupPromise = null;
let retryTimeoutId = null;
let diceBoxGeneration = 0;
let pendingResolutionFrame = null;

const DICEBOX_INIT_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 4000;
const HOST_LAYOUT_TIMEOUT_MS = 2000;
const HOST_LAYOUT_POLL_MS = 50;
const HOST_REGISTRATION_TIMEOUT_MS = 750;
const POST_INIT_RENDER_SETTLE_MS = 250;

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

const clearScheduledResolution = () => {
  if (pendingResolutionFrame !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(pendingResolutionFrame);
  }
  pendingResolutionFrame = null;
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

const assessWorkerSupport = () => {
  if (workerSupportState !== 'unknown') {
    return workerSupportState;
  }

  if (typeof window === 'undefined') {
    workerSupportState = 'unsupported';
    return workerSupportState;
  }

  if (typeof Worker !== 'function') {
    workerSupportState = 'unsupported';
    return workerSupportState;
  }

  if (typeof Blob !== 'function') {
    workerSupportState = 'unsupported';
    return workerSupportState;
  }

  if (typeof URL !== 'function' && (typeof URL !== 'object' || URL === null)) {
    workerSupportState = 'unsupported';
    return workerSupportState;
  }

  if (typeof URL.createObjectURL !== 'function' || typeof URL.revokeObjectURL !== 'function') {
    workerSupportState = 'unsupported';
    return workerSupportState;
  }

  try {
    const blob = new Blob(['self.onmessage = function () {}']);
    const url = URL.createObjectURL(blob);
    try {
      const testWorker = new Worker(url);
      testWorker.terminate();
      workerSupportState = 'available';
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    workerSupportState = isSecurityPolicyViolation(error) ? 'blocked' : 'unsupported';
  }

  if (!workerSupportLogged && workerSupportState !== 'available') {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      const message =
        workerSupportState === 'blocked'
          ? 'Dice box disabled: Web Worker creation is blocked by the current Content Security Policy.'
          : 'Dice box disabled: Web Workers are not supported in this environment.';
      console.warn(message);
    }
    workerSupportLogged = true;
  }

  return workerSupportState;
};

const isSecurityPolicyViolation = (error) => {
  if (!error) {
    return false;
  }

  const { name, message } =
    typeof error === 'object' && error !== null
      ? { name: error.name, message: error.message }
      : { name: null, message: String(error) };

  if (name && typeof name === 'string' && name.toLowerCase().includes('security')) {
    return true;
  }

  if (typeof message !== 'string') {
    return false;
  }

  const normalized = message.toLowerCase();

  return (
    normalized.includes('content security policy') ||
    normalized.includes('refused to create a worker') ||
    normalized.includes('blocked a frame with origin')
  );
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

const getElementLayoutSize = (element) => {
  if (!element || typeof element !== 'object') {
    return { width: 0, height: 0 };
  }

  const rect =
    typeof element.getBoundingClientRect === 'function'
      ? element.getBoundingClientRect()
      : null;

  const width =
    Number(rect?.width) || Number(element.clientWidth) || Number(element.offsetWidth) || 0;
  const height =
    Number(rect?.height) ||
    Number(element.clientHeight) ||
    Number(element.offsetHeight) ||
    0;

  return { width, height };
};

const isElementConnected = (element) => {
  if (!element || typeof element !== 'object') {
    return false;
  }

  if (typeof element.isConnected === 'boolean') {
    return element.isConnected;
  }

  return typeof document === 'undefined' || !document.body
    ? true
    : document.body.contains(element);
};

const hasUsableHostLayout = (element) => {
  if (!isElementConnected(element)) {
    return false;
  }

  const { width, height } = getElementLayoutSize(element);
  return width > 0 && height > 0;
};

const waitForUsableHostLayout = (element, timeoutMs = HOST_LAYOUT_TIMEOUT_MS) => {
  if (!element) {
    return Promise.resolve(false);
  }

  if (hasUsableHostLayout(element)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let frameId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (frameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const check = () => {
      frameId = null;
      timeoutId = null;

      if (hasUsableHostLayout(element)) {
        finish(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        finish(false);
        return;
      }

      if (typeof requestAnimationFrame === 'function') {
        frameId = requestAnimationFrame(check);
      } else {
        timeoutId = setTimeout(check, HOST_LAYOUT_POLL_MS);
      }
    };

    check();
  });
};

const waitForDiceBoxTarget = (timeoutMs = HOST_REGISTRATION_TIMEOUT_MS) => {
  const initialTarget = resolveDiceBoxTarget();
  if (initialTarget.element || initialTarget.selector) {
    return Promise.resolve(initialTarget);
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let frameId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (frameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };

    const finish = (target) => {
      cleanup();
      resolve(target);
    };

    const check = () => {
      frameId = null;
      timeoutId = null;
      const target = resolveDiceBoxTarget();

      if (target.element || target.selector || Date.now() - startedAt >= timeoutMs) {
        finish(target);
        return;
      }

      if (typeof requestAnimationFrame === 'function') {
        frameId = requestAnimationFrame(check);
      } else {
        timeoutId = setTimeout(check, HOST_LAYOUT_POLL_MS);
      }
    };

    check();
  });
};

const waitForRenderSettle = (timeoutMs = POST_INIT_RENDER_SETTLE_MS) =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const settle = () => {
      window.setTimeout(resolve, timeoutMs);
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(settle);
      });
    } else {
      settle();
    }
  });

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

const purgeContainerChildren = (element) => {
  if (!element || typeof element !== 'object') {
    return;
  }

  try {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Failed to clear dice box container', error);
    }
  }
};

const clearCurrentHostContainer = () => {
  const { element, selector } = resolveDiceBoxTarget();
  if (element) {
    purgeContainerChildren(element);
    return;
  }

  if (!selector || typeof document === 'undefined') {
    return;
  }

  const resolved = document.querySelector(selector);
  if (resolved) {
    purgeContainerChildren(resolved);
  }
};

const resetInstance = () => {
  diceBoxGeneration += 1;
  if (diceBoxInstance) {
    destroyInstance(diceBoxInstance);
  }

  clearCurrentHostContainer();

  diceBoxInstance = null;
  diceBoxPromise = null;
  diceBoxReady = false;
  activeThemeColor = null;
  activeThemeName = DEFAULT_DICE_THEME;
  clearScheduledRetry();
  clearScheduledResolution();
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

const normalizeThemeName = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const match = DICE_BOX_THEMES.find((theme) => theme.toLowerCase() === lower);
  return match || null;
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

const applyThemeNameToInstance = (instance, themeName) => {
  if (!instance || typeof instance.updateConfig !== 'function') {
    return false;
  }

  if (themeName === activeThemeName) {
    return true;
  }

  try {
    instance.updateConfig({ theme: themeName });
    activeThemeName = themeName || DEFAULT_DICE_THEME;
    return true;
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Dice box theme update failed', error);
    }
  }

  return false;
};

const applyPendingThemeName = (instance) => {
  if (!instance || !pendingThemeName) {
    return;
  }

  if (applyThemeNameToInstance(instance, pendingThemeName)) {
    pendingThemeName = null;
  }
};

const getRendererCanvas = (renderer) => {
  if (!renderer) {
    return null;
  }

  if (renderer.domElement && typeof renderer.domElement === 'object') {
    return renderer.domElement;
  }

  if (renderer.canvas && typeof renderer.canvas === 'object') {
    return renderer.canvas;
  }

  return null;
};

const updateRendererResolution = (renderer, canvas, pixelRatio) => {
  if (!renderer || typeof renderer.setPixelRatio !== 'function') {
    return false;
  }

  try {
    renderer.setPixelRatio(pixelRatio);
    if (typeof renderer.setSize === 'function' && canvas) {
      const { clientWidth, clientHeight } = canvas;
      if (clientWidth && clientHeight) {
        renderer.setSize(clientWidth, clientHeight, false);
      }
    }
    return true;
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Dice box renderer resolution update failed', error);
    }
  }

  return false;
};

const updateCanvasResolution = (canvas, pixelRatio) => {
  if (!canvas || typeof canvas !== 'object') {
    return;
  }

  const { clientWidth, clientHeight } = canvas;
  if (!clientWidth || !clientHeight) {
    return;
  }

  try {
    canvas.width = Math.round(clientWidth * pixelRatio);
    canvas.height = Math.round(clientHeight * pixelRatio);
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Dice box canvas resolution update failed', error);
    }
  }
};

const refreshDiceBoxResolution = (instance) => {
  if (!instance || typeof window === 'undefined') {
    return;
  }

  const pixelRatio = Number(window.devicePixelRatio) > 0 ? window.devicePixelRatio : 1;
  const renderer = instance.renderer || instance._renderer || null;
  const canvas = getRendererCanvas(renderer) || instance.canvas || null;

  const performUpdate = () => {
    pendingResolutionFrame = null;
    if (diceBoxInstance !== instance) {
      return;
    }

    const rendererUpdated = updateRendererResolution(renderer, canvas, pixelRatio);
    if (!rendererUpdated && canvas) {
      updateCanvasResolution(canvas, pixelRatio);
    }

    if (typeof instance.resize === 'function') {
      try {
        instance.resize();
      } catch (error) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('Dice box resize failed', error);
        }
      }
    }
  };

  clearScheduledResolution();

  if (typeof window.requestAnimationFrame === 'function') {
    pendingResolutionFrame = window.requestAnimationFrame(performUpdate);
  } else {
    performUpdate();
  }
};

async function ensureDiceBox({ waitForTarget = false } = {}) {
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
  const { element: targetElement, selector } = waitForTarget
    ? await waitForDiceBoxTarget()
    : resolveDiceBoxTarget();
  if (!targetElement && !selector) {
    scheduleRetry();
    return null;
  }

  const workerState = assessWorkerSupport();
  if (workerState === 'blocked') {
    markDiceBoxFailure({ fatal: true });
    return null;
  }

  if (workerState === 'unsupported') {
    markDiceBoxFailure({ fatal: true });
    return null;
  }
  if (!diceBoxPromise) {
    const initGeneration = diceBoxGeneration;
    const pending = (async () => {
      try {
        const DiceBox = await getDiceBoxConstructor();
        if (diceBoxGeneration !== initGeneration) {
          return null;
        }
        let target = targetElement || selector;
        if (!target) {
          throw new Error('Dice box target was not available');
        }

        if (targetElement) {
          const hostReady = await waitForUsableHostLayout(targetElement);
          if (diceBoxGeneration !== initGeneration) {
            return null;
          }
          if (!hostReady && selector && typeof document !== 'undefined') {
            const resolvedTarget = document.querySelector(selector);
            if (resolvedTarget && resolvedTarget !== targetElement) {
              target = resolvedTarget;
            }
          }
        }

        const normalizedPendingTheme = normalizeThemeName(pendingThemeName);
        const normalizedActiveTheme = normalizeThemeName(activeThemeName);
        const resolvedThemeName = normalizedPendingTheme || normalizedActiveTheme || DEFAULT_DICE_THEME;

        const overrides = {};
        if (pendingThemeColor) {
          overrides.themeColor = pendingThemeColor;
        }
        if (resolvedThemeName) {
          overrides.theme = resolvedThemeName;
        }

        const options = createDiceBoxConfig(
          Object.keys(overrides).length > 0 ? overrides : null,
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
        if (diceBoxGeneration !== initGeneration) {
          destroyInstance(instance);
          return null;
        }
        diceBoxInstance = instance;
        diceBoxFailed = false;
        diceBoxDisabled = false;
        activeThemeName = resolvedThemeName || DEFAULT_DICE_THEME;
        applyPendingThemeName(instance);
        applyPendingThemeColor(instance);
        refreshDiceBoxResolution(instance);
        await waitForRenderSettle();
        if (diceBoxGeneration !== initGeneration) {
          destroyInstance(instance);
          return null;
        }
        clearScheduledRetry();
        setAvailability(true);
        return instance;
      } catch (error) {
        // eslint-disable-next-line no-console
        if (diceBoxGeneration === initGeneration) {
          console.error('Dice box initialization failed', error);
          const fatal =
            isSecurityPolicyViolation(error) ||
            (workerSupportState === 'blocked' &&
              typeof error?.message === 'string' &&
              error.message.toLowerCase().includes('timed out')) ||
            workerSupportState === 'unsupported';
          markDiceBoxFailure({ fatal });
        }
        return null;
      }
    })();
    diceBoxPromise = pending;
    pending.finally(() => {
      if (
        diceBoxPromise === pending &&
        (!diceBoxInstance || diceBoxGeneration !== initGeneration)
      ) {
        diceBoxPromise = null;
      }
    });
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

export const isDiceBoxInitializing = () => Boolean(diceBoxPromise) && !diceBoxReady;

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

export const clearDiceBoxResults = () => {
  if (diceBoxInstance && typeof diceBoxInstance.clear === 'function') {
    try {
      diceBoxInstance.clear();
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('Failed to clear dice box results', error);
      }
    }
  }
};

const isKnownDiceBoxFaceMapMiss = (value) => {
  const message =
    value && typeof value === 'object' && typeof value.message === 'string'
      ? value.message
      : typeof value === 'string'
      ? value
      : '';

  return (
    message.includes('colliderFaceMap Error: No value found for d20') &&
    message.includes('mesh face -1')
  );
};

const suppressKnownDiceBoxFaceMapMiss = () => {
  if (typeof console === 'undefined' || typeof console.error !== 'function') {
    return () => {};
  }

  const originalError = console.error;
  console.error = (...args) => {
    if (args.some(isKnownDiceBoxFaceMapMiss)) {
      return;
    }

    originalError(...args);
  };

  return () => {
    if (console.error === originalError) {
      return;
    }

    console.error = originalError;
  };
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
    const instance = await ensureDiceBox({ waitForTarget: true });
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

      let restoreConsoleError = null;

      const finalize = (rawResults, usedFallback = false, { failure = false } = {}) => {
        restoreConsoleError?.();
        restoreConsoleError = null;

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
            restoreConsoleError?.();
            restoreConsoleError = null;
            resolve({ rolls: parsed, rawResults, usedFallback: false });
            return;
          }
          finalize(fallback, true);
        },
        () => {
          finalize(fallback, true);
        }
      );

      try {
        restoreConsoleError = suppressKnownDiceBoxFaceMapMiss();
        instance.roll(notations);
      } catch (error) {
        cleanup();
        restoreConsoleError?.();
        restoreConsoleError = null;
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

export const setDiceBoxTheme = (themeName) => {
  const normalized =
    themeName === null || themeName === undefined
      ? DEFAULT_DICE_THEME
      : normalizeThemeName(themeName);

  if (!normalized) {
    pendingThemeName = null;
    return;
  }

  if (normalized === activeThemeName) {
    pendingThemeName = null;
    return;
  }

  pendingThemeName = normalized;

  if (diceBoxInstance) {
    applyPendingThemeName(diceBoxInstance);
  }
};

export default {
  registerDiceBoxContainer,
  subscribeToDiceBoxAvailability,
  isDiceBoxReady,
  hasDiceBoxFailed,
  isDiceBoxInitializing,
  clearDiceBoxResults,
  rollDiceWithBox,
  setDiceBoxThemeColor,
  setDiceBoxTheme,
};
