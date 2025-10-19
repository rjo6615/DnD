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

  const selected = [];
  if (upperBound !== null) {
    numericValues.forEach((value) => {
      if (selected.length >= totalDice) {
        return;
      }
      if (value >= MIN_ROLL_VALUE && value <= upperBound) {
        selected.push(value);
      }
    });
  }

  if (selected.length < totalDice) {
    numericValues.forEach((value) => {
      if (selected.length >= totalDice) {
        return;
      }
      selected.push(value);
    });
  }

  return selected.length >= totalDice ? selected.slice(0, totalDice) : null;
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
