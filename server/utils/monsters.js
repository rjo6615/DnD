const normalizeArmorClass = (armorClass) => {
  if (Array.isArray(armorClass)) {
    return armorClass
      .map((entry) => {
        if (entry && typeof entry === 'object') {
          return {
            value: Number(entry.value) || 0,
            type: entry.type || null,
            desc: entry.desc || null,
          };
        }
        const numeric = Number(entry);
        if (Number.isFinite(numeric)) {
          return { value: numeric, type: null, desc: null };
        }
        return null;
      })
      .filter((entry) => entry && entry.value);
  }

  const numeric = Number(armorClass);
  if (Number.isFinite(numeric)) {
    return [{ value: numeric, type: null, desc: null }];
  }

  return [];
};

const normalizeSpeed = (speed) => {
  if (!speed) {
    return {};
  }

  if (typeof speed === 'string') {
    return { walk: speed };
  }

  if (typeof speed === 'object') {
    return Object.entries(speed).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});
  }

  return {};
};

const normalizeConditionImmunities = (conditionImmunities) => {
  if (!Array.isArray(conditionImmunities)) {
    return [];
  }

  return conditionImmunities
    .map((entry) => {
      if (!entry) {
        return null;
      }
      if (typeof entry === 'string') {
        return entry;
      }
      if (typeof entry === 'object' && entry.name) {
        return entry.name;
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeProficiencies = (proficiencies) => {
  if (!Array.isArray(proficiencies)) {
    return [];
  }

  return proficiencies
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const name = entry.proficiency?.name || entry.name || null;
      const value = Number(entry.value);
      return {
        name,
        value: Number.isFinite(value) ? value : null,
      };
    })
    .filter((entry) => entry && entry.name);
};

const normalizeMonsterDetail = (monster) => {
  if (!monster || typeof monster !== 'object') {
    return null;
  }

  return {
    index: monster.index,
    slug: monster.slug || null,
    name: monster.name,
    size: monster.size || null,
    type: monster.type || null,
    subtype: monster.subtype || null,
    alignment: monster.alignment || null,
    armorClass: normalizeArmorClass(monster.armor_class),
    hitPoints: Number(monster.hit_points) || 0,
    hitDice: monster.hit_dice || null,
    speed: normalizeSpeed(monster.speed),
    abilityScores: {
      str: Number(monster.strength) || 0,
      dex: Number(monster.dexterity) || 0,
      con: Number(monster.constitution) || 0,
      int: Number(monster.intelligence) || 0,
      wis: Number(monster.wisdom) || 0,
      cha: Number(monster.charisma) || 0,
    },
    savingThrows: monster.saving_throws || [],
    skills: monster.skills || {},
    proficiencies: normalizeProficiencies(monster.proficiencies),
    senses: monster.senses || {},
    languages: monster.languages || '',
    challengeRating: monster.challenge_rating ?? null,
    xp: monster.xp ?? null,
    proficiencyBonus: monster.proficiency_bonus ?? monster.prof_bonus ?? null,
    damageVulnerabilities: monster.damage_vulnerabilities || [],
    damageResistances: monster.damage_resistances || [],
    damageImmunities: monster.damage_immunities || [],
    conditionImmunities: normalizeConditionImmunities(monster.condition_immunities),
    actions: monster.actions || [],
    bonusActions: monster.bonus_actions || [],
    reactions: monster.reactions || [],
    legendaryActions: monster.legendary_actions || [],
    specialAbilities: monster.special_abilities || [],
    lairActions: monster.lair_actions || [],
    regionalEffects: monster.regional_effects || [],
    image: monster.image || null,
    source: '5e-srd',
  };
};

const buildEnemyRecord = (monsterDetail, enemyId, nameOverride) => {
  if (!monsterDetail) {
    return null;
  }

  const normalized = normalizeMonsterDetail(monsterDetail);
  if (!normalized) {
    return null;
  }

  const trimmedName = typeof nameOverride === 'string' ? nameOverride.trim() : '';

  return {
    ...normalized,
    enemyId,
    name: trimmedName || normalized.name,
    addedAt: new Date().toISOString(),
  };
};

module.exports = {
  normalizeArmorClass,
  normalizeSpeed,
  normalizeMonsterDetail,
  buildEnemyRecord,
};
