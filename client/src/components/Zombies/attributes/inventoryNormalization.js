const parseProperties = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((prop) => prop.trim())
      .filter(Boolean);
  }
  return [];
};

export const normalizeWeapons = (weapons, { includeUnowned = false } = {}) => {
  if (!Array.isArray(weapons)) return [];
  return weapons
    .map((weapon) => {
      if (!weapon) return null;
      const owned =
        typeof weapon === 'object' && weapon !== null ? weapon.owned : undefined;
      if (!includeUnowned && owned === false) return null;
      if (Array.isArray(weapon)) {
        const [
          name,
          category,
          damage,
          properties,
          weight,
          cost,
          type,
          attackBonus,
        ] = weapon;
        if (!name) return null;
        const normalized = {
          name,
          category: category ?? '',
          damage: typeof damage === 'string' ? damage : String(damage || ''),
          properties: parseProperties(properties),
          weight: weight ?? '',
          cost: cost ?? '',
        };
        if (type !== undefined) normalized.type = type;
        if (attackBonus !== undefined) normalized.attackBonus = attackBonus;
        if (owned !== undefined) normalized.owned = owned;
        return normalized;
      }
      if (typeof weapon === 'string') {
        return {
          name: weapon,
          category: '',
          damage: '',
          properties: [],
          weight: '',
          cost: '',
        };
      }
      if (typeof weapon === 'object') {
        const {
          name,
          category = '',
          damage = '',
          properties,
          weight = '',
          cost = '',
          type,
          attackBonus,
          owned: ownedProp,
          ...rest
        } = weapon;
        if (!name) return null;
        if (!includeUnowned && ownedProp === false) return null;
        const normalized = {
          name,
          category,
          damage: typeof damage === 'string' ? damage : String(damage || ''),
          properties: parseProperties(properties),
          weight,
          cost,
          ...(type !== undefined ? { type } : {}),
          ...(attackBonus !== undefined ? { attackBonus } : {}),
          ...rest,
        };
        if (ownedProp !== undefined) normalized.owned = ownedProp;
        return normalized;
      }
      return null;
    })
    .filter(Boolean);
};

export const normalizeArmor = (armor, { includeUnowned = false } = {}) => {
  if (!Array.isArray(armor)) return [];
  return armor
    .map((piece) => {
      if (!piece) return null;
      const owned =
        typeof piece === 'object' && piece !== null ? piece.owned : undefined;
      if (!includeUnowned && owned === false) return null;
      if (Array.isArray(piece)) {
        const [
          name,
          acBonus,
          maxDex,
          strengthRequirement,
          stealth,
          weight,
          cost,
          type,
        ] = piece;
        if (!name) return null;
        const normalized = {
          name,
          acBonus: acBonus ?? '',
          maxDex: maxDex ?? null,
        };
        if (strengthRequirement !== undefined)
          normalized.strength = strengthRequirement;
        if (stealth !== undefined) normalized.stealth = stealth;
        if (weight !== undefined) normalized.weight = weight;
        if (cost !== undefined) normalized.cost = cost;
        if (type !== undefined) normalized.type = type;
        if (owned !== undefined) normalized.owned = owned;
        return normalized;
      }
      if (typeof piece === 'string') {
        return {
          name: piece,
          acBonus: '',
          maxDex: null,
          strength: null,
          stealth: null,
          weight: '',
          cost: '',
        };
      }
      if (typeof piece === 'object') {
        const {
          name,
          armorName,
          displayName,
          acBonus = '',
          maxDex = null,
          strength = null,
          stealth = null,
          weight = '',
          cost = '',
          type,
          owned: ownedProp,
          ...rest
        } = piece;
        const resolvedName = name || armorName;
        if (!resolvedName) return null;
        if (!includeUnowned && ownedProp === false) return null;
        const normalized = {
          name: resolvedName,
          acBonus,
          maxDex,
          strength,
          stealth,
          weight,
          cost,
          ...(type !== undefined ? { type } : {}),
          ...(displayName !== undefined ? { displayName } : {}),
          ...(armorName !== undefined ? { armorName } : {}),
          ...rest,
        };
        if (!name && armorName && normalized.displayName === undefined) {
          normalized.displayName = armorName;
        }
        if (ownedProp !== undefined) normalized.owned = ownedProp;
        return normalized;
      }
      return null;
    })
    .filter(Boolean);
};

const isObjectLike = (value) => typeof value === 'object' && value !== null;

export const normalizeItems = (items, { includeUnowned = false } = {}) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return null;
      const owned = isObjectLike(item) ? item.owned : undefined;
      if (!includeUnowned && owned === false) return null;
      if (Array.isArray(item)) {
        const [
          name,
          category,
          weight,
          cost,
          notes,
          statBonuses,
          skillBonuses,
        ] = item;
        if (!name) return null;
        const normalized = {
          name,
          category: category ?? '',
          weight: weight ?? '',
          cost: cost ?? '',
          statBonuses:
            statBonuses && typeof statBonuses === 'object' ? statBonuses : {},
          skillBonuses:
            skillBonuses && typeof skillBonuses === 'object'
              ? skillBonuses
              : {},
        };
        if (notes !== undefined) normalized.notes = notes;
        if (owned !== undefined) normalized.owned = owned;
        return normalized;
      }
      if (typeof item === 'string') {
        return {
          name: item,
          category: '',
          weight: '',
          cost: '',
          statBonuses: {},
          skillBonuses: {},
        };
      }
      if (isObjectLike(item)) {
        const {
          name,
          itemName,
          displayName,
          category = '',
          weight = '',
          cost = '',
          statBonuses,
          skillBonuses,
          notes,
          owned: ownedProp,
          ...rest
        } = item;
        const resolvedName = name || itemName || displayName;
        if (!resolvedName) return null;
        if (!includeUnowned && ownedProp === false) return null;
        const normalized = {
          name: resolvedName,
          category,
          weight,
          cost,
          statBonuses:
            statBonuses && typeof statBonuses === 'object' ? statBonuses : {},
          skillBonuses:
            skillBonuses && typeof skillBonuses === 'object'
              ? skillBonuses
              : {},
          ...rest,
        };
        if (itemName !== undefined) normalized.itemName = itemName;
        if (displayName !== undefined) {
          normalized.displayName = displayName;
        } else if (!name && itemName) {
          normalized.displayName = itemName;
        }
        if (notes !== undefined) normalized.notes = notes;
        if (ownedProp !== undefined) normalized.owned = ownedProp;
        return normalized;
      }
      return null;
    })
    .filter(Boolean);
};
