export const BARBARIAN_PROGRESSION = [
  { level: 1, rageUses: 2, rageDamage: 2, weaponMasteryCount: 2 },
];

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
  const items = [
    ...Object.values(character?.equipment || {}),
    ...(Array.isArray(character?.armor) ? character.armor : []),
  ].filter(Boolean);
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
