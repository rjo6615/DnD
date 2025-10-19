const MIN_ROLL_VALUE = 1;

export const normalizeRollValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.round(parsed);
  return Number.isFinite(rounded) ? Math.max(MIN_ROLL_VALUE, rounded) : null;
};

export const sanitizeRollGroup = (values, count, sides) => {
  const totalDice = Number(count);
  if (!Number.isFinite(totalDice) || totalDice <= 0) {
    return null;
  }

  const collection = Array.isArray(values) ? values : [values];
  if (!Array.isArray(collection) || collection.length === 0) {
    return null;
  }

  const upperBound = Number.isFinite(sides) && sides > 0 ? Math.round(sides) : null;
  const numericValues = collection
    .map((entry) => normalizeRollValue(entry))
    .filter((entry) => entry !== null);

  if (numericValues.length === 0) {
    return null;
  }

  const clampToBounds = (value) => {
    const normalized = Math.max(MIN_ROLL_VALUE, Math.round(value));
    if (upperBound !== null) {
      return Math.min(upperBound, normalized);
    }
    return normalized;
  };

  if (upperBound !== null) {
    const forward = [];
    numericValues.forEach((value) => {
      if (forward.length >= totalDice) {
        return;
      }
      if (value >= MIN_ROLL_VALUE && value <= upperBound) {
        forward.push(value);
      }
    });
    if (forward.length >= totalDice) {
      return forward.slice(0, totalDice);
    }

    const reverse = [];
    for (let index = numericValues.length - 1; index >= 0; index -= 1) {
      if (reverse.length >= totalDice) {
        break;
      }
      const value = numericValues[index];
      if (value >= MIN_ROLL_VALUE && value <= upperBound) {
        reverse.push(value);
      }
    }
    if (reverse.length >= totalDice) {
      return reverse.reverse().slice(0, totalDice);
    }
  }

  const fallback = [];
  numericValues.forEach((value) => {
    if (fallback.length >= totalDice) {
      return;
    }
    fallback.push(clampToBounds(value));
  });

  if (fallback.length === 0) {
    return null;
  }

  if (fallback.length < totalDice) {
    const lastValue = fallback[fallback.length - 1] || clampToBounds(upperBound);
    while (fallback.length < totalDice) {
      fallback.push(lastValue);
    }
  }

  return fallback.slice(0, totalDice);
};

export const collectRollValues = (groups) => {
  if (!Array.isArray(groups) || groups.length === 0) {
    return [];
  }

  const results = [];
  groups.forEach((group) => {
    if (!Array.isArray(group)) {
      return;
    }
    group.forEach((value) => {
      const normalized = normalizeRollValue(value);
      if (normalized !== null) {
        results.push(normalized);
      }
    });
  });

  return results;
};

export default {
  normalizeRollValue,
  sanitizeRollGroup,
  collectRollValues,
};
