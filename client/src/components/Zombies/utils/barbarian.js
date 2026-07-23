import { applyActiveEffect, hasActiveEffect, removeActiveEffect } from './combatTimeline';

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

export const BARBARIAN_SUBCLASSES = [
  {
    id: "path-of-the-berserker",
    name: "Path of the Berserker",
    classId: "barbarian",
    level: 3,
    features: [
      {
        id: "berserker-frenzy",
        name: "Frenzy",
        level: 3,
        description:
          "If you use Reckless Attack while your Rage is active, you deal extra damage to the first target you hit on your turn with a Strength-based attack. To determine the extra damage, roll a number of d6s equal to your Rage Damage bonus, and add them together. The damage has the same type as the weapon or Unarmed Strike used for the attack.",
      },
      {
        id: "berserker-mindless-rage",
        name: "Mindless Rage",
        level: 6,
        description:
          "You have Immunity to the Charmed and Frightened conditions while your Rage is active. If you’re Charmed or Frightened when you enter your Rage, the condition ends on you.",
      },
      { id: "berserker-retaliation", name: "Retaliation", level: 10 },
      { id: "berserker-intimidating-presence", name: "Intimidating Presence", level: 14 },
    ],
  },
];

export const BARBARIAN_LEVEL_1_SKILLS = [
  "animalHandling",
  "athletics",
  "intimidation",
  "nature",
  "perception",
  "survival",
];

export const PRIMAL_KNOWLEDGE_SKILLS = [
  "acrobatics",
  "intimidation",
  "perception",
  "stealth",
  "survival",
];

export const getBarbarianSubclass = (character) =>
  character?.classState?.barbarian?.subclass ||
  character?.subclasses?.barbarian ||
  character?.barbarian?.subclass ||
  null;

export const getAvailableBarbarianSubclasses = (character) =>
  getBarbarianLevel(character) >= 3 ? BARBARIAN_SUBCLASSES : [];

export const isPathOfTheBerserker = (character) => {
  const subclass = getBarbarianSubclass(character);
  const id = normalize(subclass?.id ?? subclass?.key ?? subclass?.name ?? subclass);
  return id === "path-of-the-berserker" || id === "path of the berserker" || id === "berserker";
};

export const getActiveBarbarianSubclassFeatures = (character) => {
  const level = getBarbarianLevel(character);
  const selected = getBarbarianSubclass(character);
  if (!selected || level < 3) return [];
  const selectedId = normalize(selected?.id ?? selected?.key ?? selected?.name ?? selected);
  const subclass = BARBARIAN_SUBCLASSES.find((entry) => {
    const entryId = normalize(entry.id);
    const entryName = normalize(entry.name);
    return selectedId === entryId || selectedId === entryName || selectedId === "berserker";
  });
  return (subclass?.features || []).filter((feature) => level >= feature.level);
};

export const hasPrimalKnowledge = (character) => getBarbarianLevel(character) >= 3;
export const hasFeralInstinct = (character) => getBarbarianLevel(character) >= 7;

export const getFeralInstinctInitiativeSources = (character) =>
  hasFeralInstinct(character) ? ["Feral Instinct"] : [];

export const resolveInitiativeRollMode = (character, options = {}) => {
  const advantageSources = Array.isArray(options.advantageSources)
    ? [...options.advantageSources]
    : [];
  const disadvantageSources = Array.isArray(options.disadvantageSources)
    ? [...options.disadvantageSources]
    : [];

  advantageSources.push(...getFeralInstinctInitiativeSources(character));

  return {
    mode: resolveD20RollMode({ advantageSources, disadvantageSources }),
    advantageSources,
    disadvantageSources,
  };
};
export const isPrimalKnowledgeSkill = (skillKey) =>
  PRIMAL_KNOWLEDGE_SKILLS.includes(normalize(skillKey));
export const canUsePrimalKnowledgeForSkill = (character, skillKey) =>
  hasPrimalKnowledge(character) && isRageActive(character) && isPrimalKnowledgeSkill(skillKey);

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
    id: "barbarian-primal-knowledge",
    name: "Primal Knowledge",
    class: "Barbarian",
    classId: "barbarian",
    level: 3,
    type: "configuration",
    description:
      "You gain proficiency in one additional Barbarian skill. While raging, you can use Strength for Acrobatics, Intimidation, Perception, Stealth, and Survival checks.",
  },
  {
    id: "barbarian-subclass",
    name: "Barbarian Subclass",
    class: "Barbarian",
    classId: "barbarian",
    level: 3,
    type: "configuration",
    description: "Choose a Barbarian subclass. Path of the Berserker is currently available.",
  },
  {
    id: "feral-instinct",
    name: "Feral Instinct",
    class: "Barbarian",
    classId: "barbarian",
    level: 7,
    type: "passive",
    description:
      "Your instincts are so honed that you have Advantage on Initiative rolls.",
  },
  {
    id: "instinctive-pounce",
    name: "Instinctive Pounce",
    class: "Barbarian",
    classId: "barbarian",
    level: 7,
    type: "passive",
    description:
      "As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.",
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
  {
    id: "brutal-strike",
    name: "Brutal Strike",
    class: "Barbarian",
    classId: "barbarian",
    level: 9,
    type: "toggle",
    icon: "fist",
    description:
      "Your next eligible Strength-based attack this turn forgoes the Advantage from Reckless Attack. On a hit, it deals an extra 1d10 damage and lets you choose Forceful Blow or Hamstring Blow.",
  },
];

export const getAvailableBarbarianFeatures = (character) => {
  const barbarianLevel = getBarbarianLevel(character);
  const selectedSubclass = getBarbarianSubclass(character);
  const selectedSubclassName =
    typeof selectedSubclass === "object" && selectedSubclass !== null
      ? selectedSubclass.name || selectedSubclass.label || selectedSubclass.id
      : selectedSubclass;
  return [
    ...BARBARIAN_FEATURES.filter((feature) => barbarianLevel >= feature.level).map((feature) =>
      feature.id === "barbarian-subclass" && selectedSubclassName
        ? { ...feature, subclass: selectedSubclassName }
        : feature
    ),
    ...getActiveBarbarianSubclassFeatures(character).map((feature) => ({
      ...feature,
      class: "Barbarian",
      classId: "barbarian",
      subclass: "Path of the Berserker",
      type: "passive",
    })),
  ];
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

export const RECKLESS_ATTACK_RAGE_ERROR = "Reckless Attack requires Rage to be active.";

export const canActivateRecklessAttack = (character) => ({
  allowed: getBarbarianLevel(character) >= 2 && isRageActive(character),
  reason: !isRageActive(character) ? RECKLESS_ATTACK_RAGE_ERROR : getBarbarianLevel(character) < 2 ? "Reckless Attack requires Barbarian level 2." : null,
});

export const declareRecklessAttack = (character) => {
  if (!canActivateRecklessAttack(character).allowed) return character;
  const state = getRecklessAttackState(character);
  if (state.active) return character;
  return withRecklessAttack(character, {
    active: true,
    declared: true,
    firstAttackMade: false,
    defensiveDrawbackPending: true,
  });
};

export const createRecklessAttackEffect = (combatantId) => ({
  id: `reckless-attack:${combatantId}`,
  definitionId: 'reckless-attack',
  name: 'Reckless Attack',
  sourceCombatantId: combatantId,
  targetCombatantId: combatantId,
  expiration: { type: 'sourceTurn', combatantId, boundary: 'start', remainingOccurrences: 1 },
  stackKey: `reckless-attack:${combatantId}`,
  stackPolicy: 'ignore',
  description: 'Reckless Attack active. Attack rolls against this character have Advantage until the start of their next turn.',
});

export const activateRecklessAttack = (character, combatState, combatantId) => {
  const eligibility = canActivateRecklessAttack(character);
  if (!eligibility.allowed) throw new Error(eligibility.reason);
  if (!combatantId) throw new Error('Reckless Attack requires an active combatant.');
  return {
    character: declareRecklessAttack(character),
    combatState: applyActiveEffect(combatState, createRecklessAttackEffect(combatantId)),
  };
};

export const endRecklessAttack = (character) => {
  const state = getRecklessAttackState(character);
  if (!state.active && !state.firstAttackMade && !state.declared) return character;
  return resetFrenzyTurn(withRecklessAttack(character, { active: false, declared: false, firstAttackMade: false }));
};

export const markBarbarianAttackRoll = (character) => character;

/**
 * Reckless Attack is evaluated from the resolved attack, after any choice of
 * attack ability has been made.  Callers should provide isMeleeAttack on new
 * attack models; the kind fallback keeps older attack producers compatible.
 */
export const qualifiesForRecklessAttack = (attack = {}, context = {}) => {
  const ability = normalize(
    attack.attackAbility ?? attack.ability ?? attack.abilityKey ?? attack.stat
  );
  const kind = normalize(attack.kind ?? attack.type ?? attack.attackType);
  const range = normalize(attack.rangeType ?? attack.range ?? attack.category);
  const isMeleeAttack = typeof attack.isMeleeAttack === "boolean"
    ? attack.isMeleeAttack
    : typeof context.isMeleeAttack === "boolean"
      ? context.isMeleeAttack
      : !range.includes("ranged") && (
        kind.includes("melee") ||
        kind.includes("weapon") ||
        kind.includes("unarmed") ||
        attack.isWeaponAttack ||
        attack.isUnarmedStrike
      );

  return context.isSourceCurrentTurn !== false &&
    (ability === "str" || ability === "strength") &&
    isMeleeAttack &&
    !attack.isDamageRoll;
};

export const getRecklessAttackAdvantageSources = (character, attack = {}) => {
  const state = getRecklessAttackState(character);
  if (!state.active) return [];
  return qualifiesForRecklessAttack(attack, {
    isSourceCurrentTurn: attack.isSourceCurrentTurn,
    isMeleeAttack: attack.isMeleeAttack,
  }) ? ["Reckless Attack"] : [];
};

export const resolveAttackRollMode = (character, attack = {}, options = {}) => {
  const advantageSources = Array.isArray(options.advantageSources)
    ? [...options.advantageSources]
    : [];
  const disadvantageSources = Array.isArray(options.disadvantageSources)
    ? [...options.disadvantageSources]
    : [];
  const suppressed = new Set(options.suppressedAdvantageSources || []);
  advantageSources.push(...getRecklessAttackAdvantageSources(character, attack));
  const resolvedAdvantages = advantageSources.filter((source) => !suppressed.has(source));
  return {
    mode: resolveD20RollMode({ advantageSources: resolvedAdvantages, disadvantageSources }),
    advantageSources: resolvedAdvantages,
    disadvantageSources,
  };
};

export const BRUTAL_STRIKE_ERROR = "Brutal Strike requires Reckless Attack to be active.";

export const getBrutalStrikePendingEffect = (combatState, combatantId) =>
  (combatState?.activeEffects || []).find((effect) =>
    effect.definitionId === 'brutal-strike-pending' && effect.sourceCombatantId === combatantId);

export const isBrutalStrikeEligibleAttack = ({ attack = {}, ability, rollMode } = {}) => {
  const actualAbility = normalize(ability ?? attack.attackAbility ?? attack.ability ?? attack.abilityKey ?? attack.stat);
  const kind = normalize(attack.kind ?? attack.type ?? attack.attackType);
  const qualifyingKind = kind.includes('weapon') || kind.includes('unarmed') || attack.isWeaponAttack || attack.isUnarmedStrike;
  return (actualAbility === 'str' || actualAbility === 'strength') && qualifyingKind && !attack.isSpellAttack && rollMode !== 'disadvantage';
};

export const canActivateBrutalStrike = ({ character, combatState, combatant, combatantId, currentTurnCombatantId } = {}) => {
  const barbarianCombatantId = combatantId ?? combatant?.characterId ?? combatant?.id;
  const activeCombatantId = currentTurnCombatantId ?? combatState?.participants?.[combatState?.activeTurn]?.characterId;
  let reason = null;
  if (getBarbarianLevel(character) < 9) reason = 'Brutal Strike requires Barbarian level 9.';
  else if (!barbarianCombatantId || barbarianCombatantId !== activeCombatantId) reason = "Brutal Strike can be activated only on the Barbarian's turn.";
  else if (!hasActiveEffect(combatState, barbarianCombatantId, 'reckless-attack')) reason = BRUTAL_STRIKE_ERROR;
  else if (hasActiveEffect(combatState, barbarianCombatantId, 'brutal-strike-pending')) reason = 'Brutal Strike is already ready.';
  return { allowed: !reason, reason };
};

export const createBrutalStrikePendingEffect = (combatantId, attackId) => ({
  id: `brutal-strike-pending:${combatantId}`,
  definitionId: 'brutal-strike-pending',
  name: 'Brutal Strike',
  sourceCombatantId: combatantId,
  targetCombatantId: combatantId,
  ...(attackId ? { attackId } : {}),
  expiration: { type: 'sourceTurn', combatantId, boundary: 'end', remainingOccurrences: 1, expireOnCurrentTurn: true },
  stackKey: `brutal-strike-pending:${combatantId}`,
  stackPolicy: 'ignore',
});

export const activateBrutalStrike = (input) => {
  const eligibility = canActivateBrutalStrike(input);
  if (!eligibility.allowed) throw new Error(eligibility.reason);
  return applyActiveEffect(input.combatState, createBrutalStrikePendingEffect(input.combatantId, input.attack?.id));
};

export const consumeBrutalStrikeOnAttackResolution = (combatState, combatantId) => {
  const pending = getBrutalStrikePendingEffect(combatState, combatantId);
  return pending ? removeActiveEffect(combatState, pending.id) : combatState;
};

export const createBrutalStrikeChoice = ({ resolutionId, sourceCombatantId, targetCombatantId, attackId, attackName, damageType, brutalStrikeDamage }) => ({
  id: `brutal-strike-choice:${resolutionId}`,
  definitionId: 'brutal-strike-choice-pending',
  name: 'Brutal Strike choice pending',
  resolutionId, sourceCombatantId, targetCombatantId, attackId, attackName, damageType,
  brutalStrikeDamage: Number(brutalStrikeDamage) || 0,
  expiration: { type: 'combatEnd' },
  stackKey: `brutal-strike-choice:${resolutionId}`,
  stackPolicy: 'ignore',
});

export const resolveBrutalStrikeAttack = (combatState, resolution) => {
  const consumed = consumeBrutalStrikeOnAttackResolution(combatState, resolution.sourceCombatantId);
  if (resolution.outcome === 'miss') return consumed;
  return applyActiveEffect(consumed, createBrutalStrikeChoice(resolution));
};

export const getBrutalStrikeChoice = (combatState, sourceCombatantId) =>
  (combatState?.activeEffects || []).find((effect) => effect.definitionId === 'brutal-strike-choice-pending' && effect.sourceCombatantId === sourceCombatantId);

export const applyBrutalStrikeChoice = (combatState, { resolutionId, choice }) => {
  const pending = (combatState?.activeEffects || []).find((effect) => effect.definitionId === 'brutal-strike-choice-pending' && effect.resolutionId === resolutionId);
  if (!pending) return combatState;
  let next = removeActiveEffect(combatState, pending.id);
  if (choice === 'hamstring') next = applyHamstringBlow(next, pending);
  return { ...next, eventLog: [...next.eventLog, {
    type: 'brutalStrikeChoiceResolved', resolutionId, choice,
    sourceCombatantId: pending.sourceCombatantId, targetCombatantId: pending.targetCombatantId,
  }] };
};

export const createHamstringBlowEffect = ({ sourceCombatantId, targetCombatantId }) => ({
  id: `hamstring-blow:${targetCombatantId}:${Date.now()}`,
  definitionId: 'hamstring-blow',
  name: 'Hamstring Blow',
  sourceCombatantId,
  targetCombatantId,
  modifiers: [{ type: 'speed', operation: 'add', value: -15 }],
  expiration: { type: 'sourceTurn', combatantId: sourceCombatantId, boundary: 'start', remainingOccurrences: 1 },
  stackKey: `hamstring-blow:${targetCombatantId}`,
  stackPolicy: 'replace',
});

export const applyHamstringBlow = (combatState, input) =>
  applyActiveEffect(combatState, createHamstringBlowEffect(input));


export const getFrenzyState = (character) => ({
  usedThisTurn: Boolean(character?.classState?.barbarian?.frenzy?.usedThisTurn),
});

export const markFrenzyUsed = (character) => ({
  ...character,
  classState: {
    ...(character?.classState || {}),
    barbarian: {
      ...(character?.classState?.barbarian || {}),
      frenzy: { usedThisTurn: true },
    },
  },
});

export const resetFrenzyTurn = (character) => {
  if (!getFrenzyState(character).usedThisTurn) return character;
  return {
    ...character,
    classState: {
      ...(character?.classState || {}),
      barbarian: {
        ...(character?.classState?.barbarian || {}),
        frenzy: { usedThisTurn: false },
      },
    },
  };
};

export const getFrenzyDamageDice = (character, attack = {}) => {
  if (getBarbarianLevel(character) < 3 || !isPathOfTheBerserker(character)) return null;
  if (!isRageActive(character) || !getRecklessAttackState(character).active) return null;
  if (getFrenzyState(character).usedThisTurn) return null;
  if (attack.isOwnTurn === false) return null;
  if (attack.hit === false || attack.dealsDamage === false) return null;
  if (getRageDamageBonus(character, attack) <= 0) return null;
  return { label: "Frenzy", count: getRageDamageBonus(character, attack), sides: 6 };
};
