export const BARBARIAN_PROGRESSION = [
  { level: 1, rageUses: 2, rageDamage: 2, weaponMasteryCount: 2 },
  { level: 2, rageUses: 2, rageDamage: 2, weaponMasteryCount: 2 },
  { level: 3, rageUses: 3, rageDamage: 2, weaponMasteryCount: 2 },
  { level: 4, rageUses: 3, rageDamage: 2, weaponMasteryCount: 3 },
  { level: 5, rageUses: 3, rageDamage: 2, weaponMasteryCount: 3 },
  { level: 6, rageUses: 4, rageDamage: 2, weaponMasteryCount: 3 },
  { level: 7, rageUses: 4, rageDamage: 2, weaponMasteryCount: 3 },
  { level: 8, rageUses: 4, rageDamage: 2, weaponMasteryCount: 3 },
  { level: 9, rageUses: 4, rageDamage: 3, weaponMasteryCount: 3 },
  { level: 10, rageUses: 4, rageDamage: 3, weaponMasteryCount: 4 },
  { level: 11, rageUses: 4, rageDamage: 3, weaponMasteryCount: 4 },
  { level: 12, rageUses: 5, rageDamage: 3, weaponMasteryCount: 4 },
  { level: 13, rageUses: 5, rageDamage: 3, weaponMasteryCount: 4 },
  { level: 14, rageUses: 5, rageDamage: 3, weaponMasteryCount: 4 },
  { level: 15, rageUses: 5, rageDamage: 3, weaponMasteryCount: 4 },
  { level: 16, rageUses: 5, rageDamage: 4, weaponMasteryCount: 4 },
  { level: 17, rageUses: 6, rageDamage: 4, weaponMasteryCount: 4 },
  { level: 18, rageUses: 6, rageDamage: 4, weaponMasteryCount: 4 },
  { level: 19, rageUses: 6, rageDamage: 4, weaponMasteryCount: 4 },
  { level: 20, rageUses: 6, rageDamage: 4, weaponMasteryCount: 4 },
];

const resolveD20RollMode = ({ advantageSources = [], disadvantageSources = [] } = {}) => {
  const hasAdvantage = Array.isArray(advantageSources) && advantageSources.length > 0;
  const hasDisadvantage = Array.isArray(disadvantageSources) && disadvantageSources.length > 0;
  if (hasAdvantage && !hasDisadvantage) return "advantage";
  if (hasDisadvantage && !hasAdvantage) return "disadvantage";
  return "normal";
};

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const getBarbarianLevel = (character) => {
  if (!Array.isArray(character?.occupation)) return 0;
  return character.occupation.reduce((total, entry) => {
    const name = normalize(
      entry?.Name ?? entry?.Occupation ?? entry?.name ?? entry?.occupation
    );
    if (name !== "barbarian") return total;
    const level = Number(entry?.Level ?? entry?.level ?? 0);
    return total + (Number.isFinite(level) && level > 0 ? level : 0);
  }, 0);
};

export const getBarbarianProgression = (levelOrCharacter) => {
  const level =
    typeof levelOrCharacter === "number"
      ? levelOrCharacter
      : getBarbarianLevel(levelOrCharacter);
  return BARBARIAN_PROGRESSION.reduce(
    (best, row) => (level >= row.level ? row : best),
    null
  );
};

export const hasHeavyArmorEquipped = (character) => {
  const items = Object.values(character?.equipment || {}).filter(Boolean);
  return items.some((item) => {
    if (Array.isArray(item)) return normalize(item[0]).includes("heavy");
    const text = [
      item.category,
      item.type,
      item.armorType,
      item.name,
      item.__source,
      item.source,
    ]
      .map(normalize)
      .join(" ");
    return (
      text.includes("heavy armor") ||
      text === "heavy" ||
      text.includes(" heavy ")
    );
  });
};

export const isRageActive = (character) =>
  Boolean(
    character?.classState?.barbarian?.rage?.active ??
      character?.barbarian?.rage?.active
  );
export const getRageUsesRemaining = (character) => {
  const max = getBarbarianProgression(character)?.rageUses || 0;
  const raw =
    character?.classState?.barbarian?.rage?.current ??
    character?.barbarian?.rage?.current;
  const current = Number(raw);
  return Number.isFinite(current)
    ? Math.max(0, Math.min(max, Math.floor(current)))
    : max;
};

export const getRageState = (character) => {
  const progression = getBarbarianProgression(character);
  const max = progression?.rageUses || 0;
  return {
    active: isRageActive(character),
    current: getRageUsesRemaining(character),
    max,
    rageDamage: progression?.rageDamage || 0,
  };
};

const withRage = (character, rage) => ({
  ...character,
  classState: {
    ...(character?.classState || {}),
    barbarian: { ...(character?.classState?.barbarian || {}), rage },
  },
});

export const activateRage = (character) => {
  const state = getRageState(character);
  if (state.active || state.current <= 0 || hasHeavyArmorEquipped(character))
    return character;
  return withRage(character, { active: true, current: state.current - 1 });
};

export const endRage = (character) => {
  const state = getRageState(character);
  if (!state.active) return character;
  return withRage(character, { active: false, current: state.current });
};

export const applyRageRest = (character, restType) => {
  const state = getRageState(character);
  if (!state.max) return character;
  const long = restType === "long";
  const next = withRage(character, {
    active: long ? false : state.active,
    current: long ? state.max : Math.min(state.max, state.current + 1),
  });
  if (!long) return next;
  return withWeaponMasteries(next, {
    ...(next?.classState?.barbarian?.weaponMasteries || {}),
    canReplaceAfterLongRest: true,
  });
};

const hasCondition = (character, conditionName) => {
  const target = normalize(conditionName);
  const conditions = [
    ...(Array.isArray(character?.conditions) ? character.conditions : []),
    ...(Array.isArray(character?.statusConditions) ? character.statusConditions : []),
  ];
  return conditions.some((condition) =>
    normalize(condition?.name ?? condition?.label ?? condition?.id ?? condition) === target
  );
};

export const BARBARIAN_FEATURES = [
  {
    id: "barbarian-rage",
    name: "Rage",
    class: "Barbarian",
    classId: "barbarian",
    level: 1,
    type: "toggle",
  },
  {
    id: "barbarian-weapon-mastery",
    name: "Weapon Mastery",
    class: "Barbarian",
    classId: "barbarian",
    level: 1,
    type: "configuration",
    description:
      "Your training with weapons allows you to use the mastery property of selected simple or martial melee weapon types. You can replace one selection when you finish a Long Rest.",
  },
  {
    id: "danger-sense",
    name: "Danger Sense",
    class: "Barbarian",
    classId: "barbarian",
    level: 2,
    type: "passive",
    description:
      "You gain an uncanny sense of when things aren’t as they should be, giving you an edge when you dodge perils.\n\nYou have Advantage on Dexterity saving throws unless you have the Incapacitated condition.",
    hideUseButton: true,
  },
  {
    id: "reckless-attack",
    name: "Reckless Attack",
    class: "Barbarian",
    classId: "barbarian",
    level: 2,
    type: "toggle",
    description:
      "You can throw aside all concern for defense to attack with increased ferocity. When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time.\n\nThis app currently applies the offensive Advantage to your Strength attack rolls; the defensive drawback is intentionally deferred until incoming attack modifiers are supported.",
  },
];

export const getAvailableBarbarianFeatures = (character) => {
  const barbarianLevel = getBarbarianLevel(character);
  return BARBARIAN_FEATURES.filter((feature) => barbarianLevel >= feature.level);
};

export const hasDangerSense = (character) => getBarbarianLevel(character) >= 2;

export const getDangerSenseSavingThrowSources = (character, abilityKey) => {
  if (normalize(abilityKey) !== "dex" || !hasDangerSense(character)) return [];
  return hasCondition(character, "incapacitated") ? [] : ["Danger Sense"];
};

export const resolveSavingThrowRollMode = (character, abilityKey, options = {}) => {
  const advantageSources = Array.isArray(options.advantageSources)
    ? [...options.advantageSources]
    : [];
  const disadvantageSources = Array.isArray(options.disadvantageSources)
    ? [...options.disadvantageSources]
    : [];

  if (getRageBenefits(character).advantage.savingThrows.includes(normalize(abilityKey))) {
    advantageSources.push("Rage");
  }
  advantageSources.push(...getDangerSenseSavingThrowSources(character, abilityKey));

  return {
    mode: resolveD20RollMode({ advantageSources, disadvantageSources }),
    advantageSources,
    disadvantageSources,
  };
};

export const getRageBenefits = (character) =>
  isRageActive(character)
    ? {
        resistances: ["bludgeoning", "piercing", "slashing"],
        advantage: { abilityChecks: ["str"], savingThrows: ["str"] },
        blocksSpellcasting: true,
        blocksConcentration: true,
      }
    : {
        resistances: [],
        advantage: { abilityChecks: [], savingThrows: [] },
        blocksSpellcasting: false,
        blocksConcentration: false,
      };

export const getRageDamageBonus = (character, attack = {}) => {
  if (!isRageActive(character)) return 0;
  const ability = normalize(attack.ability ?? attack.abilityKey ?? attack.stat);
  const kind = normalize(attack.kind ?? attack.type ?? attack.attackType);
  const isQualifyingKind =
    kind.includes("weapon") ||
    kind.includes("unarmed") ||
    attack.isWeaponAttack ||
    attack.isUnarmedStrike;
  if (
    ability !== "str" ||
    attack.isSpellAttack ||
    !isQualifyingKind ||
    attack.dealsDamage === false
  )
    return 0;
  return getBarbarianProgression(character)?.rageDamage || 0;
};

export const isEligibleBarbarianWeaponMastery = (weapon) => {
  const category = normalize(weapon?.category ?? weapon?.weaponCategory);
  const name = normalize(weapon?.name ?? weapon?.type);
  return (
    Boolean(name) &&
    (category === "simple melee" ||
      category === "martial melee" ||
      category.includes("simple melee") ||
      category.includes("martial melee"))
  );
};

export const validateBarbarianWeaponMasteries = (
  character,
  selections = []
) => {
  const count = getBarbarianProgression(character)?.weaponMasteryCount || 0;
  const seen = new Set();
  const valid = [];
  for (const weapon of selections) {
    const key = normalize(weapon?.type ?? weapon?.name ?? weapon);
    if (!key || seen.has(key)) continue;
    if (typeof weapon === "object" && !isEligibleBarbarianWeaponMastery(weapon))
      continue;
    seen.add(key);
    valid.push(key);
  }
  return {
    valid: valid.slice(0, count),
    count,
    hasDuplicates: seen.size < selections.length,
  };
};

export const getWeaponMasteryState = (character) => {
  const progression = getBarbarianProgression(character);
  const count = progression?.weaponMasteryCount || 0;
  const selections =
    character?.classState?.barbarian?.weaponMasteries?.selections || [];
  return {
    selections: validateBarbarianWeaponMasteries(character, selections).valid,
    count,
    canReplaceAfterLongRest: Boolean(
      character?.classState?.barbarian?.weaponMasteries?.canReplaceAfterLongRest
    ),
  };
};

const withWeaponMasteries = (character, weaponMasteries) => ({
  ...character,
  classState: {
    ...(character?.classState || {}),
    barbarian: { ...(character?.classState?.barbarian || {}), weaponMasteries },
  },
});

export const setWeaponMasterySelections = (character, selections = []) => {
  const result = validateBarbarianWeaponMasteries(character, selections);
  if (result.valid.length !== selections.length || result.hasDuplicates) {
    return character;
  }
  return withWeaponMasteries(character, {
    ...(character?.classState?.barbarian?.weaponMasteries || {}),
    selections: result.valid,
  });
};

export const replaceWeaponMasteryAfterLongRest = (
  character,
  fromKey,
  replacementWeapon
) => {
  const state = getWeaponMasteryState(character);
  if (!state.canReplaceAfterLongRest) return character;
  const normalizedFrom = normalize(fromKey);
  const normalizedReplacement = normalize(
    replacementWeapon?.type ?? replacementWeapon?.name ?? replacementWeapon
  );
  if (!normalizedFrom || !state.selections.includes(normalizedFrom))
    return character;
  if (
    typeof replacementWeapon === "object" &&
    !isEligibleBarbarianWeaponMastery(replacementWeapon)
  )
    return character;
  if (state.selections.includes(normalizedReplacement)) return character;
  const selections = state.selections.map((entry) =>
    entry === normalizedFrom ? normalizedReplacement : entry
  );
  return withWeaponMasteries(character, {
    selections,
    canReplaceAfterLongRest: false,
  });
};


const withRecklessAttack = (character, recklessAttack) => ({
  ...character,
  classState: {
    ...(character?.classState || {}),
    barbarian: { ...(character?.classState?.barbarian || {}), recklessAttack },
  },
});

export const getRecklessAttackState = (character) => {
  const raw = character?.classState?.barbarian?.recklessAttack || {};
  return {
    active: getBarbarianLevel(character) >= 2 && Boolean(raw.active),
    firstAttackMade: Boolean(raw.firstAttackMade),
    declared: Boolean(raw.declared ?? raw.active),
    defensiveDrawbackPending: Boolean(raw.defensiveDrawbackPending),
  };
};

export const declareRecklessAttack = (character) => {
  if (getBarbarianLevel(character) < 2) return character;
  const state = getRecklessAttackState(character);
  if (state.active) return character;
  return withRecklessAttack(character, {
    active: true,
    declared: true,
    firstAttackMade: false,
    defensiveDrawbackPending: true,
  });
};

export const endRecklessAttack = (character) => {
  const state = getRecklessAttackState(character);
  if (!state.active && !state.firstAttackMade && !state.declared) return character;
  return withRecklessAttack(character, { active: false, declared: false, firstAttackMade: false });
};

export const markBarbarianAttackRoll = (character) => character;

export const getRecklessAttackAdvantageSources = (character, attack = {}) => {
  const state = getRecklessAttackState(character);
  if (!state.active) return [];
  const ability = normalize(attack.ability ?? attack.abilityKey ?? attack.stat);
  const kind = normalize(attack.kind ?? attack.type ?? attack.attackType);
  const isQualifyingKind =
    kind.includes("weapon") ||
    kind.includes("unarmed") ||
    attack.isWeaponAttack ||
    attack.isUnarmedStrike;
  if (ability !== "str" || attack.isSpellAttack || !isQualifyingKind || attack.isDamageRoll) {
    return [];
  }
  return ["Reckless Attack"];
};

export const resolveAttackRollMode = (character, attack = {}, options = {}) => {
  const advantageSources = Array.isArray(options.advantageSources)
    ? [...options.advantageSources]
    : [];
  const disadvantageSources = Array.isArray(options.disadvantageSources)
    ? [...options.disadvantageSources]
    : [];
  advantageSources.push(...getRecklessAttackAdvantageSources(character, attack));
  return {
    mode: resolveD20RollMode({ advantageSources, disadvantageSources }),
    advantageSources,
    disadvantageSources,
  };
};
