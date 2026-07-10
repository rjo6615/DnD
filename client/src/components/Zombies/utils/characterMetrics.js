import { normalizeEquipmentMap } from '../attributes/equipmentNormalization';
import {
  aggregateStatEffects,
  collectFeatAbilityBonuses,
  collectFeatNumericBonuses,
  isExplicitlyUnowned,
  STAT_KEYS,
} from './derivedStats';
import { getBarbarianLevel } from './barbarian';

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
  const normalizedEquipment = normalizeEquipmentMap(character?.equipment);
  const equipmentEntries = Object.values(normalizedEquipment || {}).filter(Boolean);
  const { bonuses: equipmentBonuses, overrides: equipmentOverrides } = aggregateStatEffects(
    equipmentEntries
  );
  const { bonuses: accessoryBonuses, overrides: accessoryOverrides } = aggregateStatEffects(
    normalizeAccessoryCollection(character)
  );
  const featAbilityBonuses = collectFeatAbilityBonuses(character?.feat);
  const raceBonuses = character?.race?.abilities || {};

  return STAT_KEYS.reduce((acc, key) => {
    const total =
      baseStats[key] +
      itemBonuses[key] +
      equipmentBonuses[key] +
      accessoryBonuses[key] +
      featAbilityBonuses[key] +
      toFiniteNumberOrZero(raceBonuses[key]);

    const overrideCandidates = [
      itemOverrides?.[key],
      equipmentOverrides?.[key],
      accessoryOverrides?.[key],
    ];
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

  const collectHpBonuses = (collection) => {
    const entries = Array.isArray(collection) ? collection : [];
    return entries.reduce(
      (acc, item) => {
        if (!item || typeof item !== 'object' || isExplicitlyUnowned(item)) {
          return acc;
        }

        const contributionSources = [item, item.numericBonuses];
        contributionSources.forEach((source) => {
          if (
            !source ||
            typeof source !== 'object' ||
            isExplicitlyUnowned(source)
          ) {
            return;
          }
          const bonus = toFiniteNumberOrNull(source.hpMaxBonus);
          if (bonus !== null) {
            acc.hpMaxBonus += bonus;
          }
          const perLevel = toFiniteNumberOrNull(source.hpMaxBonusPerLevel);
          if (perLevel !== null) {
            acc.hpMaxBonusPerLevel += perLevel;
          }
        });

        return acc;
      },
      { hpMaxBonus: 0, hpMaxBonusPerLevel: 0 }
    );
  };

  const normalizedEquipment = normalizeEquipmentMap(character?.equipment);
  const equipmentEntries = Object.values(normalizedEquipment || {}).filter(Boolean);
  const equipmentHpBonuses = collectHpBonuses(equipmentEntries);
  const accessoryHpBonuses = collectHpBonuses(normalizeAccessoryCollection(character));

  return {
    hpMaxBonus:
      (directHpBonus !== null ? directHpBonus : 0) +
      (raceHpBonus !== null ? raceHpBonus : 0) +
      toFiniteNumberOrZero(featBonuses.hpMaxBonus) +
      equipmentHpBonuses.hpMaxBonus +
      accessoryHpBonuses.hpMaxBonus,
    hpMaxBonusPerLevel:
      (directHpBonusPerLevel !== null ? directHpBonusPerLevel : 0) +
      (raceHpBonusPerLevel !== null ? raceHpBonusPerLevel : 0) +
      toFiniteNumberOrZero(featBonuses.hpMaxBonusPerLevel) +
      equipmentHpBonuses.hpMaxBonusPerLevel +
      accessoryHpBonuses.hpMaxBonusPerLevel,
  };
};

const resolveArmorItems = (character) => {
  const normalizedEquipment = normalizeEquipmentMap(character?.equipment);
  const equipmentEntries = Object.values(normalizedEquipment || {}).filter(Boolean);

  if (equipmentEntries.length) {
    return equipmentEntries.filter((item) => {
      if (!item || typeof item !== 'object' || isExplicitlyUnowned(item)) {
        return false;
      }

      if (Array.isArray(item)) {
        return true;
      }

      const source = String(item.__source ?? item.source ?? '').toLowerCase();
      if (source === 'armor') {
        return true;
      }

      return (
        item.acBonus != null ||
        item.armorBonus != null ||
        item.ac != null ||
        item.maxDex != null ||
        item.maxDexterity != null ||
        item.checkPenalty != null ||
        item.stealth != null
      );
    });
  }

  const armorCollection = Array.isArray(character?.armor) ? character.armor : [];
  return armorCollection.filter(Boolean);
};

const isShieldItem = (item) => {
  if (!item) {
    return false;
  }

  if (Array.isArray(item)) {
    const [name] = item;
    return typeof name === 'string' && name.toLowerCase().includes('shield');
  }

  const category = String(item.category ?? item.type ?? '').toLowerCase();
  if (category.includes('shield')) {
    return true;
  }

  const name = String(
    item.name ?? item.title ?? item.displayName ?? item.label ?? ''
  ).toLowerCase();
  return name.includes('shield');
};


const isArmorItem = (item) => {
  if (!item || isShieldItem(item)) {
    return false;
  }

  if (Array.isArray(item)) {
    const [name, acBonus, maxDex, category] = item;
    const text = String(`${name ?? ''} ${category ?? ''}`).toLowerCase();
    if (text.includes('no armor') || text.includes('unarmored') || text.includes('none')) {
      return false;
    }
    return (
      text.includes('armor') ||
      text.includes('light') ||
      text.includes('medium') ||
      text.includes('heavy') ||
      (Number.isFinite(Number(acBonus)) && Number(acBonus) > 0 && !String(name ?? '').toLowerCase().includes('shield')) ||
      (Number.isFinite(Number(maxDex)) && Number(maxDex) > 0)
    );
  }

  if (typeof item !== 'object') {
    return false;
  }

  const source = String(item.__source ?? item.source ?? '').toLowerCase();
  const category = String(item.category ?? item.type ?? item.armorType ?? '').toLowerCase();
  const name = String(item.name ?? item.title ?? item.displayName ?? item.label ?? '').toLowerCase();
  const text = `${source} ${category} ${name}`;

  return (
    source === 'armor' ||
    category.includes('armor') ||
    category === 'light' ||
    category === 'medium' ||
    category === 'heavy' ||
    text.includes('light armor') ||
    text.includes('medium armor') ||
    text.includes('heavy armor')
  );
};

const resolveMonkLevel = (character) => {
  if (!Array.isArray(character?.occupation)) {
    return 0;
  }

  return character.occupation.reduce((total, occupationEntry) => {
    if (!occupationEntry || typeof occupationEntry !== 'object') {
      return total;
    }

    const name = String(
      occupationEntry.Name ??
        occupationEntry.Occupation ??
        occupationEntry.name ??
        occupationEntry.occupation ??
        ''
    ).toLowerCase();

    if (name !== 'monk') {
      return total;
    }

    const levelValue = Number(
      occupationEntry.Level ??
        occupationEntry.level ??
        occupationEntry.Levels ??
        occupationEntry.levels ??
        0
    );

    if (!Number.isFinite(levelValue) || levelValue <= 0) {
      return total;
    }

    return total + levelValue;
  }, 0);
};

const hasUnarmoredDefense = (character) => {
  const searchValue = 'unarmored defense';
  const checkValue = (value) => {
    if (!value) return false;
    if (Array.isArray(value)) {
      return value.some((entry) => checkValue(entry));
    }
    if (typeof value === 'object') {
      return Object.values(value).some((entry) => checkValue(entry));
    }
    return typeof value === 'string' && value.toLowerCase().includes(searchValue);
  };

  return checkValue(character?.features);
};

export const calculateCharacterArmorClass = (character, overrides = {}) => {
  if (!character || typeof character !== 'object') {
    return null;
  }

  const armorItems = resolveArmorItems(character);

  const armorAcBonus = armorItems.reduce((total, item) => {
    if (Array.isArray(item)) {
      const value = Number(item[1] ?? 0);
      if (!Number.isFinite(value)) {
        return total;
      }
      return total + (value > 10 ? value - 10 : value);
    }

    const value = Number(item?.acBonus ?? item?.armorBonus ?? item?.ac ?? 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);

  const featAcBonus =
    overrides.featAcBonus !== undefined
      ? toFiniteNumberOrZero(overrides.featAcBonus)
      : toFiniteNumberOrZero(collectFeatNumericBonuses(character?.feat).ac);

  const additionalAcBonus = toFiniteNumberOrZero(overrides.additionalAcBonus);

  const armorMaxDexCaps = armorItems
    .map((item) => {
      if (Array.isArray(item)) {
        const value = Number(item[2] ?? 0);
        return Number.isFinite(value) ? value : 0;
      }

      const value = Number(item?.maxDex ?? item?.maxDexterity ?? 0);
      return Number.isFinite(value) ? value : 0;
    })
    .filter((value) => Number.isFinite(value));

  const abilities = calculateEffectiveAbilityScores(character);

  const baseDexMod = Number.isFinite(overrides.dexMod)
    ? overrides.dexMod
    : Math.floor((abilities.dex - 10) / 2);

  let dexContribution = baseDexMod;
  const positiveCaps = armorMaxDexCaps.filter((value) => value !== 0 && value > 0);
  if (positiveCaps.length > 0) {
    const minCap = Math.min(...positiveCaps);
    if (Number.isFinite(minCap) && minCap < dexContribution) {
      dexContribution = minCap;
    }
  }

  const baseWisMod = Number.isFinite(overrides.wisMod)
    ? overrides.wisMod
    : Math.floor((abilities.wis - 10) / 2);

  const baseConMod = Number.isFinite(overrides.conMod)
    ? overrides.conMod
    : Math.floor((abilities.con - 10) / 2);

  const hasShieldEquipped = armorItems.some((item) => isShieldItem(item));
  const hasArmorEquipped = armorItems.some((item) => isArmorItem(item));

  const monkLevel = resolveMonkLevel(character);
  const barbarianLevel = getBarbarianLevel(character);
  const unarmoredBaseBonuses = [];
  if (!hasArmorEquipped && !hasShieldEquipped && (hasUnarmoredDefense(character) || monkLevel > 0)) {
    unarmoredBaseBonuses.push(baseWisMod);
  }
  if (!hasArmorEquipped && barbarianLevel > 0) {
    unarmoredBaseBonuses.push(baseConMod);
  }
  const unarmoredAbilityBonus = unarmoredBaseBonuses.length > 0 ? Math.max(...unarmoredBaseBonuses) : 0;

  const armorClass = 10 + armorAcBonus + featAcBonus + additionalAcBonus + dexContribution + unarmoredAbilityBonus;
  const normalized = Number(armorClass);
  return Number.isFinite(normalized) ? normalized : null;
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
          return null;
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
