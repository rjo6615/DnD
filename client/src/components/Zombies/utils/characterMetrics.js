import { aggregateStatEffects, collectFeatAbilityBonuses, collectFeatNumericBonuses, STAT_KEYS } from './derivedStats';

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFiniteNumberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumLevels = (occupation) => {
  if (!Array.isArray(occupation)) {
    return 0;
  }
  return occupation.reduce((total, entry) => total + toFiniteNumberOrZero(entry?.Level), 0);
};

const normalizeAccessoryCollection = (character) => {
  if (Array.isArray(character?.accessories)) {
    return character.accessories;
  }
  if (Array.isArray(character?.accessory)) {
    return character.accessory;
  }
  return [];
};

const calculateEffectiveAbilityScores = (character) => {
  if (!character || typeof character !== 'object') {
    return STAT_KEYS.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
  }

  const baseStats = STAT_KEYS.reduce((acc, key) => {
    acc[key] = toFiniteNumberOrZero(character?.[key]);
    return acc;
  }, {});

  const { bonuses: itemBonuses, overrides: itemOverrides } = aggregateStatEffects(character?.item);
  const { bonuses: accessoryBonuses, overrides: accessoryOverrides } = aggregateStatEffects(
    normalizeAccessoryCollection(character)
  );
  const featAbilityBonuses = collectFeatAbilityBonuses(character?.feat);
  const raceBonuses = character?.race?.abilities || {};

  return STAT_KEYS.reduce((acc, key) => {
    const total =
      baseStats[key] +
      itemBonuses[key] +
      accessoryBonuses[key] +
      featAbilityBonuses[key] +
      toFiniteNumberOrZero(raceBonuses[key]);

    const overrideCandidates = [itemOverrides?.[key], accessoryOverrides?.[key]];
    const highestOverride = overrideCandidates.reduce((max, candidate) => {
      const numeric = toFiniteNumberOrNull(candidate);
      if (numeric === null) {
        return max;
      }
      return max === null || numeric > max ? numeric : max;
    }, null);

    acc[key] = highestOverride !== null && highestOverride > total ? highestOverride : total;
    return acc;
  }, {});
};

const calculateConModifier = (character) => {
  const abilities = calculateEffectiveAbilityScores(character);
  return Math.floor((abilities.con - 10) / 2);
};

const resolveHpBonusFromSource = (character) => {
  const featBonuses = collectFeatNumericBonuses(character?.feat);

  const directHpBonus = toFiniteNumberOrNull(character?.hpMaxBonus);
  const directHpBonusPerLevel = toFiniteNumberOrNull(character?.hpMaxBonusPerLevel);

  const raceHpBonus = toFiniteNumberOrNull(character?.race?.hpMaxBonus);
  const raceHpBonusPerLevel = toFiniteNumberOrNull(
    character?.race?.hpMaxBonusPerLevel
  );

  return {
    hpMaxBonus:
      (directHpBonus !== null ? directHpBonus : 0) +
      (raceHpBonus !== null ? raceHpBonus : 0) +
      toFiniteNumberOrZero(featBonuses.hpMaxBonus),
    hpMaxBonusPerLevel:
      (directHpBonusPerLevel !== null ? directHpBonusPerLevel : 0) +
      (raceHpBonusPerLevel !== null ? raceHpBonusPerLevel : 0) +
      toFiniteNumberOrZero(featBonuses.hpMaxBonusPerLevel),
  };
};

export const calculateCharacterHitPoints = (character, overrides = {}) => {
  if (!character || typeof character !== 'object') {
    return { currentHp: null, maxHp: null };
  }

  const totalLevel = Number.isFinite(overrides.totalLevel)
    ? overrides.totalLevel
    : sumLevels(character?.occupation);

  const conMod = Number.isFinite(overrides.conMod)
    ? overrides.conMod
    : calculateConModifier(character);

  const baseHealth = toFiniteNumberOrNull(
    overrides.baseHealth !== undefined ? overrides.baseHealth : character?.health
  );

  const currentHpCandidates = [
    overrides.currentHp,
    character?.currentHp,
    character?.hpCurrent,
    character?.tempHealth,
  ];

  const currentHp = currentHpCandidates.reduce((resolved, candidate) => {
    if (resolved !== null) {
      return resolved;
    }
    return toFiniteNumberOrNull(candidate);
  }, null);

  const { hpMaxBonus: fallbackBonus, hpMaxBonusPerLevel: fallbackPerLevel } =
    resolveHpBonusFromSource(character);

  const hpMaxBonus = Number.isFinite(overrides.hpMaxBonus)
    ? overrides.hpMaxBonus
    : fallbackBonus;

  const hpMaxBonusPerLevel = Number.isFinite(overrides.hpMaxBonusPerLevel)
    ? overrides.hpMaxBonusPerLevel
    : fallbackPerLevel;

  const resolvedCurrent =
    currentHp !== null
      ? currentHp
      : (() => {
          const fallbackOverride = toFiniteNumberOrNull(overrides.fallbackCurrentHp);
          if (fallbackOverride !== null) {
            return fallbackOverride;
          }
          return toFiniteNumberOrNull(character?.health);
        })();

  const maxHp =
    baseHealth === null
      ? null
      : baseHealth + conMod * totalLevel + hpMaxBonus + hpMaxBonusPerLevel * totalLevel;

  return {
    currentHp: resolvedCurrent,
    maxHp: Number.isFinite(maxHp) ? maxHp : null,
  };
};

export default calculateCharacterHitPoints;
