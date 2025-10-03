import { SKILLS } from '../skillSchema';

export const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const createEmptyStatMap = () => ({
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
});

export const aggregateStatEffects = (collection) => {
  const entries = Array.isArray(collection) ? collection : [];
  return entries.reduce(
    (acc, el) => {
      STAT_KEYS.forEach((key) => {
        const bonusValue = toNumber(el?.statBonuses?.[key]);
        if (!Number.isNaN(bonusValue)) {
          acc.bonuses[key] += bonusValue;
        }
        const overrideRaw = el?.statOverrides?.[key];
        if (overrideRaw !== undefined && overrideRaw !== null) {
          const overrideValue = Number(overrideRaw);
          if (!Number.isNaN(overrideValue)) {
            const current = acc.overrides[key];
            acc.overrides[key] =
              current === undefined ? overrideValue : Math.max(current, overrideValue);
          }
        }
      });
      return acc;
    },
    { bonuses: createEmptyStatMap(), overrides: {} }
  );
};

const extractFeatBonuses = (feat) => {
  const abilityBonuses = createEmptyStatMap();
  const result = {
    abilityBonuses,
    initiative: 0,
    speed: 0,
    ac: 0,
    hpMaxBonus: 0,
    hpMaxBonusPerLevel: 0,
  };

  if (!feat) {
    return result;
  }

  if (Array.isArray(feat)) {
    const [, , ...rest] = feat;
    const abilityValues = rest.slice(SKILLS.length, SKILLS.length + STAT_KEYS.length);
    abilityValues.forEach((value, index) => {
      abilityBonuses[STAT_KEYS[index]] = toNumber(value);
    });
    const numericValues = rest.slice(SKILLS.length + STAT_KEYS.length);
    [
      result.initiative,
      result.ac,
      result.speed,
      result.hpMaxBonus,
      result.hpMaxBonusPerLevel,
    ] = numericValues.map(toNumber);
    return result;
  }

  if (typeof feat === 'object') {
    STAT_KEYS.forEach((key) => {
      abilityBonuses[key] = toNumber(feat[key]);
    });
    result.initiative = toNumber(feat.initiative);
    result.speed = toNumber(feat.speed);
    result.ac = toNumber(feat.ac);
    result.hpMaxBonus = toNumber(feat.hpMaxBonus);
    result.hpMaxBonusPerLevel = toNumber(feat.hpMaxBonusPerLevel);
  }

  return result;
};

const mergeAbilityBonuses = (target, source) => {
  STAT_KEYS.forEach((key) => {
    target[key] += toNumber(source[key]);
  });
};

export const collectFeatAbilityBonuses = (feats) => {
  const total = createEmptyStatMap();
  (Array.isArray(feats) ? feats : []).forEach((feat) => {
    const { abilityBonuses } = extractFeatBonuses(feat);
    mergeAbilityBonuses(total, abilityBonuses);
  });
  return total;
};

export const collectFeatNumericBonuses = (feats) =>
  (Array.isArray(feats) ? feats : []).reduce(
    (acc, feat) => {
      const { initiative, speed, ac, hpMaxBonus, hpMaxBonusPerLevel } = extractFeatBonuses(feat);
      acc.initiative += initiative;
      acc.speed += speed;
      acc.ac += ac;
      acc.hpMaxBonus += hpMaxBonus;
      acc.hpMaxBonusPerLevel += hpMaxBonusPerLevel;
      return acc;
    },
    { initiative: 0, speed: 0, ac: 0, hpMaxBonus: 0, hpMaxBonusPerLevel: 0 }
  );

const extractInitiativeFromSource = (source) => {
  if (!source) return 0;
  if (Array.isArray(source)) {
    return source.reduce((sum, entry) => sum + extractInitiativeFromSource(entry), 0);
  }
  if (typeof source !== 'object') {
    return 0;
  }
  let total = 0;
  if (source.initiative !== undefined) {
    total += toNumber(source.initiative);
  }
  if (source.initiativeBonus !== undefined) {
    total += toNumber(source.initiativeBonus);
  }
  if (source.bonuses) {
    total += extractInitiativeFromSource(source.bonuses);
  }
  if (source.statBonuses) {
    total += extractInitiativeFromSource(source.statBonuses);
  }
  if (source.numericBonuses) {
    total += extractInitiativeFromSource(source.numericBonuses);
  }
  if (source.effects) {
    total += extractInitiativeFromSource(source.effects);
  }
  return total;
};

const getHighestOverride = (candidates) => {
  return candidates.reduce((max, value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return max;
    }
    return max === null || numeric > max ? numeric : max;
  }, null);
};

export const calculateCharacterInitiative = (character) => {
  if (!character || typeof character !== 'object') {
    return 0;
  }

  const baseStats = STAT_KEYS.reduce((acc, key) => {
    acc[key] = toNumber(character[key]);
    return acc;
  }, {});

  const { bonuses: itemBonuses, overrides: itemOverrides } = aggregateStatEffects(
    character?.item
  );
  const accessorySource = Array.isArray(character?.accessories)
    ? character.accessories
    : Array.isArray(character?.accessory)
      ? character.accessory
      : [];
  const { bonuses: accessoryBonuses, overrides: accessoryOverrides } = aggregateStatEffects(
    accessorySource
  );
  const featAbilityBonuses = collectFeatAbilityBonuses(character?.feat);
  const raceAbilityBonuses = STAT_KEYS.reduce((acc, key) => {
    acc[key] = toNumber(character?.race?.abilities?.[key]);
    return acc;
  }, createEmptyStatMap());

  const totalDex =
    baseStats.dex +
    itemBonuses.dex +
    accessoryBonuses.dex +
    featAbilityBonuses.dex +
    raceAbilityBonuses.dex;

  const dexOverride = getHighestOverride([itemOverrides?.dex, accessoryOverrides?.dex]);
  const effectiveDex = dexOverride !== null && dexOverride > totalDex ? dexOverride : totalDex;
  const dexMod = Math.floor((effectiveDex - 10) / 2);

  const featNumericBonuses = collectFeatNumericBonuses(character?.feat);

  let initiativeTotal = dexMod + featNumericBonuses.initiative + toNumber(character?.initiative);

  initiativeTotal += extractInitiativeFromSource(character?.race);
  initiativeTotal += extractInitiativeFromSource(character?.background);
  initiativeTotal += extractInitiativeFromSource(character?.item);
  initiativeTotal += extractInitiativeFromSource(character?.items);
  initiativeTotal += extractInitiativeFromSource(character?.armor);
  initiativeTotal += extractInitiativeFromSource(character?.weapon);
  initiativeTotal += extractInitiativeFromSource(
    Array.isArray(character?.accessories) ? character.accessories : character?.accessory
  );
  initiativeTotal += extractInitiativeFromSource(character?.equipment);
  initiativeTotal += extractInitiativeFromSource(character?.miscBonuses);
  initiativeTotal += extractInitiativeFromSource(character?.bonuses);

  return initiativeTotal;
};
