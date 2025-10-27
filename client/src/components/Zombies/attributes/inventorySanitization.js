const parseNumericValue = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const sanitizeBonusRecord = (bonuses) => {
  if (!bonuses || typeof bonuses !== 'object' || Array.isArray(bonuses)) {
    return undefined;
  }

  const entries = Object.entries(bonuses).reduce((acc, [key, value]) => {
    const normalizedKey = typeof key === 'string' ? key.trim() : String(key);
    if (!normalizedKey) {
      return acc;
    }

    const parsed = parseNumericValue(value);
    if (parsed === null) {
      return acc;
    }

    acc[normalizedKey] = parsed;
    return acc;
  }, {});

  return Object.keys(entries).length ? entries : undefined;
};

const coerceInventoryItem = (entry) => {
  if (!entry) {
    return null;
  }

  if (Array.isArray(entry)) {
    const [name, category, weight, cost, notes, statBonuses, skillBonuses] = entry;
    const base = {};
    if (name !== undefined) base.name = name;
    if (category !== undefined) base.category = category;
    if (weight !== undefined) base.weight = weight;
    if (cost !== undefined) base.cost = cost;
    if (notes !== undefined) base.notes = notes;
    if (statBonuses !== undefined) base.statBonuses = statBonuses;
    if (skillBonuses !== undefined) base.skillBonuses = skillBonuses;
    return base;
  }

  if (typeof entry === 'string') {
    return { name: entry };
  }

  if (typeof entry === 'object') {
    return { ...entry };
  }

  return null;
};

export const sanitizeInventoryItem = (entry) => {
  const base = coerceInventoryItem(entry);
  if (!base) {
    return null;
  }

  const sanitized = { ...base };

  const resolvedName =
    typeof base.name === 'string' && base.name.trim()
      ? base.name.trim()
      : typeof base.displayName === 'string' && base.displayName.trim()
        ? base.displayName.trim()
        : typeof base.itemName === 'string' && base.itemName.trim()
          ? base.itemName.trim()
          : '';

  if (!resolvedName) {
    return null;
  }

  sanitized.name = resolvedName;

  if (typeof sanitized.category === 'string') {
    const trimmedCategory = sanitized.category.trim();
    if (trimmedCategory) {
      sanitized.category = trimmedCategory;
    } else {
      delete sanitized.category;
    }
  } else {
    delete sanitized.category;
  }

  const weightValue = parseNumericValue(sanitized.weight);
  if (weightValue === null) {
    delete sanitized.weight;
  } else {
    sanitized.weight = weightValue;
  }

  if (typeof sanitized.cost === 'string') {
    const trimmedCost = sanitized.cost.trim();
    if (trimmedCost) {
      sanitized.cost = trimmedCost;
    } else {
      delete sanitized.cost;
    }
  } else if (typeof sanitized.cost === 'number' && Number.isFinite(sanitized.cost)) {
    sanitized.cost = `${sanitized.cost}`;
  } else if (sanitized.cost !== undefined) {
    delete sanitized.cost;
  }

  if (typeof sanitized.notes === 'string') {
    sanitized.notes = sanitized.notes.trim();
    if (!sanitized.notes) {
      delete sanitized.notes;
    }
  } else if (sanitized.notes !== undefined) {
    delete sanitized.notes;
  }

  const statBonuses = sanitizeBonusRecord(base.statBonuses);
  if (statBonuses !== undefined) {
    sanitized.statBonuses = statBonuses;
  } else {
    delete sanitized.statBonuses;
  }

  const skillBonuses = sanitizeBonusRecord(base.skillBonuses);
  if (skillBonuses !== undefined) {
    sanitized.skillBonuses = skillBonuses;
  } else {
    delete sanitized.skillBonuses;
  }

  if (typeof base.owned === 'boolean') {
    sanitized.owned = base.owned;
  }

  return sanitized;
};

export const sanitizeInventoryItemsForUpdate = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(sanitizeInventoryItem).filter(Boolean);
};
