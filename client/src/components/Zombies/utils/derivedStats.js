import proficiencyBonus from '../../../utils/proficiencyBonus';
import { SKILLS } from '../skillSchema';

export const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const isExplicitlyUnowned = (entry) =>
  !!entry && typeof entry === 'object' && !Array.isArray(entry) && entry.owned === false;

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
      if (isExplicitlyUnowned(el)) {
        return acc;
      }
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

export const calculateAbilityModifier = (character, abilityKey) => {
  if (!character || typeof character !== 'object' || !STAT_KEYS.includes(abilityKey)) {
    return 0;
  }

  const base = toNumber(character[abilityKey]);
  const { bonuses: itemBonuses, overrides: itemOverrides } = aggregateStatEffects(character?.item);
  const accessorySource = Array.isArray(character?.accessories)
    ? character.accessories
    : Array.isArray(character?.accessory)
      ? character.accessory
      : [];
  const { bonuses: accessoryBonuses, overrides: accessoryOverrides } = aggregateStatEffects(
    accessorySource
  );
  const featAbilityBonuses = collectFeatAbilityBonuses(character?.feat);
  const raceAbilityBonus = toNumber(character?.race?.abilities?.[abilityKey]);

  const total =
    base +
    itemBonuses[abilityKey] +
    accessoryBonuses[abilityKey] +
    featAbilityBonuses[abilityKey] +
    raceAbilityBonus;
  const override = getHighestOverride([itemOverrides?.[abilityKey], accessoryOverrides?.[abilityKey]]);
  const effective = override !== null && override > total ? override : total;

  return Math.floor((effective - 10) / 2);
};

const getCharacterTotalLevel = (character) =>
  (character?.occupation || []).reduce((sum, occupation) => sum + (Number(occupation?.Level) || 0), 0);

const getSkillState = (character, skillKey) => {
  const characterSkill = character?.skills?.[skillKey] || {};
  const raceSkill = character?.race?.skills?.[skillKey] || {};
  const backgroundSkill = character?.background?.skills?.[skillKey] || {};

  const proficient = Boolean(
    characterSkill.proficient || raceSkill.proficient || backgroundSkill.proficient
  );
  const expertise = Boolean(
    characterSkill.expertise || raceSkill.expertise || backgroundSkill.expertise
  );

  return { proficient, expertise };
};

export const calculateCharacterSkillModifier = (character, skillKey, totalLevel) => {
  const skill = SKILLS.find((entry) => entry.key === skillKey);
  if (!skill) {
    return 0;
  }

  const resolvedTotalLevel = Number.isFinite(Number(totalLevel))
    ? Number(totalLevel)
    : getCharacterTotalLevel(character);
  const providedProficiency = Number(character?.proficiencyBonus);
  const profBonus = Number.isFinite(providedProficiency)
    ? providedProficiency
    : proficiencyBonus(resolvedTotalLevel);
  const { proficient, expertise } = getSkillState(character, skillKey);
  const proficiencyMultiplier = expertise ? 2 : proficient ? 1 : 0;

  const equippedItems = character?.equipment && typeof character.equipment === 'object'
    ? Object.values(character.equipment).filter(Boolean)
    : Array.isArray(character?.item)
      ? character.item.filter(Boolean)
      : [];
  const itemBonus = equippedItems.reduce(
    (sum, item) => sum + toNumber(item?.skillBonuses?.[skillKey]),
    0
  );
  const featBonus = (Array.isArray(character?.feat) ? character.feat : []).reduce(
    (sum, feat) => sum + toNumber(feat?.[skillKey]),
    0
  );
  const raceBonus = toNumber(character?.race?.[skillKey]);

  return (
    calculateAbilityModifier(character, skill.ability) +
    profBonus * proficiencyMultiplier +
    itemBonus +
    featBonus +
    raceBonus
  );
};

export const calculatePassivePerception = (character, totalLevel) =>
  10 + calculateCharacterSkillModifier(character, 'perception', totalLevel);

export const calculateCharacterInitiative = (character) => {
  if (!character || typeof character !== 'object') {
    return 0;
  }

  const dexMod = calculateAbilityModifier(character, 'dex');

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
