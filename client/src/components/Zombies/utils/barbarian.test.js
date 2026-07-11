import {
  activateRage,
  applyRageRest,
  endRage,
  getAvailableBarbarianFeatures,
  getBarbarianProgression,
  getRageBenefits,
  getRageDamageBonus,
  getRageState,
  isEligibleBarbarianWeaponMastery,
  validateBarbarianWeaponMasteries,
  getWeaponMasteryState,
  setWeaponMasterySelections,
  replaceWeaponMasteryAfterLongRest,
  resolveSavingThrowRollMode,
  declareRecklessAttack,
  endRecklessAttack,
  getRecklessAttackState,
  markBarbarianAttackRoll,
  resolveAttackRollMode,
} from "./barbarian";

const barbarian = (extra = {}) => ({
  occupation: [{ Name: "Barbarian", Level: 1 }],
  ...extra,
});

describe("barbarian rage", () => {
  it("initializes level 1 rage from progression", () => {
    expect(getBarbarianProgression(1)).toMatchObject({
      rageUses: 2,
      rageDamage: 2,
      weaponMasteryCount: 2,
    });
    expect(getRageState(barbarian())).toEqual({
      active: false,
      current: 2,
      max: 2,
      rageDamage: 2,
    });
  });


  it("scales rage uses, rage damage, and weapon mastery count from the progression table", () => {
    expect(getBarbarianProgression(3)).toMatchObject({
      rageUses: 3,
      rageDamage: 2,
      weaponMasteryCount: 2,
    });
    expect(getBarbarianProgression(4)).toMatchObject({
      rageUses: 3,
      rageDamage: 2,
      weaponMasteryCount: 3,
    });
    expect(getBarbarianProgression(9)).toMatchObject({
      rageUses: 4,
      rageDamage: 3,
      weaponMasteryCount: 3,
    });
    expect(getBarbarianProgression(17)).toMatchObject({
      rageUses: 6,
      rageDamage: 4,
      weaponMasteryCount: 4,
    });
    expect(getRageState(barbarian({ occupation: [{ Name: "Barbarian", Level: 12 }] }))).toMatchObject({
      current: 5,
      max: 5,
      rageDamage: 3,
    });
  });

  it("activates once, persists active state, and does not double spend", () => {
    const active = activateRage(barbarian());
    expect(getRageState(active)).toMatchObject({ active: true, current: 1 });
    expect(activateRage(active)).toBe(active);
    expect(getRageState(activateRage(active)).current).toBe(1);
  });

  it("cannot activate with zero uses or heavy armor", () => {
    const empty = barbarian({
      classState: { barbarian: { rage: { active: false, current: 0 } } },
    });
    expect(activateRage(empty)).toBe(empty);
    const ownedArmor = barbarian({
      armor: [{ name: "Plate", category: "Heavy Armor", source: "armor" }],
    });
    expect(getRageState(activateRage(ownedArmor))).toMatchObject({ active: true, current: 1 });
    const armored = barbarian({
      equipment: {
        chest: { name: "Plate", category: "Heavy Armor", source: "armor" },
      },
    });
    expect(activateRage(armored)).toBe(armored);
  });

  it("ends without refunding and rests recover correctly", () => {
    const active = activateRage(barbarian());
    const ended = endRage(active);
    expect(getRageState(ended)).toMatchObject({ active: false, current: 1 });
    expect(getRageState(applyRageRest(ended, "short")).current).toBe(2);
    expect(getRageState(applyRageRest(barbarian(), "short")).current).toBe(2);
    expect(getRageState(applyRageRest(active, "long"))).toMatchObject({
      active: false,
      current: 2,
    });
  });

  it("reports active rage benefits and damage restrictions", () => {
    const active = activateRage(barbarian());
    expect(getRageBenefits(active).resistances).toEqual([
      "bludgeoning",
      "piercing",
      "slashing",
    ]);
    expect(getRageBenefits(active).advantage.savingThrows).toContain("str");
    expect(getRageBenefits(active).blocksSpellcasting).toBe(true);
    expect(
      getRageDamageBonus(active, {
        ability: "str",
        type: "weapon attack",
        dealsDamage: true,
      })
    ).toBe(2);
    expect(
      getRageDamageBonus(active, {
        ability: "str",
        type: "unarmed strike",
        dealsDamage: true,
      })
    ).toBe(2);
    expect(
      getRageDamageBonus(active, {
        ability: "dex",
        type: "weapon attack",
        dealsDamage: true,
      })
    ).toBe(0);
    expect(
      getRageDamageBonus(active, {
        ability: "str",
        type: "spell attack",
        isSpellAttack: true,
      })
    ).toBe(0);
    expect(getRageBenefits(endRage(active)).resistances).toEqual([]);
  });

  it("persists selections and allows one replacement after a long rest", () => {
    const selected = setWeaponMasterySelections(barbarian(), [
      { type: "longsword", category: "martial melee" },
      { type: "dagger", category: "simple melee" },
    ]);
    expect(getWeaponMasteryState(selected).selections).toEqual([
      "longsword",
      "dagger",
    ]);
    expect(
      setWeaponMasterySelections(selected, [
        { type: "longbow", category: "martial ranged" },
      ])
    ).toBe(selected);

    const rested = applyRageRest(selected, "long");
    expect(getWeaponMasteryState(rested).canReplaceAfterLongRest).toBe(true);
    const replaced = replaceWeaponMasteryAfterLongRest(rested, "dagger", {
      type: "handaxe",
      category: "simple melee",
    });
    expect(getWeaponMasteryState(replaced)).toMatchObject({
      selections: ["longsword", "handaxe"],
      canReplaceAfterLongRest: false,
    });
  });
});

describe("barbarian weapon mastery", () => {
  it("accepts only simple or martial melee weapon definitions and rejects duplicates", () => {
    expect(
      isEligibleBarbarianWeaponMastery({
        name: "Longsword",
        category: "martial melee",
      })
    ).toBe(true);
    expect(
      isEligibleBarbarianWeaponMastery({
        name: "Longbow",
        category: "martial ranged",
      })
    ).toBe(false);
    const result = validateBarbarianWeaponMasteries(barbarian(), [
      { type: "longsword", category: "martial melee" },
      { type: "longsword", category: "martial melee" },
      { type: "dagger", category: "simple melee" },
      { type: "longbow", category: "martial ranged" },
    ]);
    expect(result.valid).toEqual(["longsword", "dagger"]);
    expect(result.count).toBe(2);
    expect(result.hasDuplicates).toBe(true);
  });
});

describe("barbarian level 2 features", () => {
  const barbarian2 = (extra = {}) => barbarian({ occupation: [{ Name: "Barbarian", Level: 2 }], ...extra });

  it("makes Danger Sense and Reckless Attack available from Barbarian level 2 only", () => {
    expect(getAvailableBarbarianFeatures(barbarian()).map((f) => f.name)).not.toContain("Danger Sense");
    expect(getAvailableBarbarianFeatures(barbarian()).map((f) => f.name)).not.toContain("Reckless Attack");
    expect(getAvailableBarbarianFeatures(barbarian2()).map((f) => f.name)).toEqual(expect.arrayContaining(["Danger Sense", "Reckless Attack"]));
    expect(getAvailableBarbarianFeatures(barbarian({ occupation: [{ Name: "Fighter", Level: 1 }, { Name: "Barbarian", Level: 1 }] })).map((f) => f.name)).not.toContain("Danger Sense");
    expect(getAvailableBarbarianFeatures(barbarian({ occupation: [{ Name: "Barbarian", Level: 5 }] })).map((f) => f.name)).toEqual(expect.arrayContaining(["Danger Sense", "Reckless Attack"]));
  });

  it("applies Rage only to active Strength saving throws", () => {
    const active = barbarian({ classState: { barbarian: { rage: { active: true, current: 1 } } } });
    expect(resolveSavingThrowRollMode(active, "str")).toMatchObject({ mode: "advantage", advantageSources: ["Rage"] });
    expect(resolveSavingThrowRollMode(barbarian({ classState: { barbarian: { rage: { active: false, current: 1 } } } }), "str").mode).toBe("normal");
    expect(resolveSavingThrowRollMode(active, "dex").mode).toBe("normal");
    expect(resolveAttackRollMode(active, { ability: "str", type: "weapon attack" }).advantageSources).not.toContain("Rage");
  });

  it("applies Danger Sense only to Dexterity saving throws and uses cancellation", () => {
    expect(resolveSavingThrowRollMode(barbarian2(), "dex")).toMatchObject({ mode: "advantage", advantageSources: ["Danger Sense"] });
    expect(resolveSavingThrowRollMode(barbarian2(), "str").mode).toBe("normal");
    expect(resolveSavingThrowRollMode(barbarian2({ conditions: [{ name: "Incapacitated" }] }), "dex").mode).toBe("normal");
    expect(resolveSavingThrowRollMode(barbarian2(), "dex", { disadvantageSources: ["Restrained"] })).toMatchObject({ mode: "normal" });
    expect(resolveSavingThrowRollMode(barbarian2(), "dex", { advantageSources: ["Help"] })).toMatchObject({ mode: "advantage", advantageSources: ["Help", "Danger Sense"] });
  });

  it("toggles Reckless Attack manually without automatic first-attack tracking", () => {
    const declared = declareRecklessAttack(barbarian2());
    expect(getRecklessAttackState(declared)).toMatchObject({ active: true, declared: true, firstAttackMade: false });
    expect(getRageState(declared).current).toBe(2);
    const attacked = markBarbarianAttackRoll(declared);
    expect(attacked).toBe(declared);
    expect(getRecklessAttackState(attacked)).toMatchObject({ active: true, firstAttackMade: false });
    const reset = endRecklessAttack(attacked);
    expect(getRecklessAttackState(reset)).toMatchObject({ active: false, firstAttackMade: false });
    expect(getRecklessAttackState(declareRecklessAttack(markBarbarianAttackRoll(barbarian2())))).toMatchObject({ active: true, firstAttackMade: false });
  });

  it("adds Reckless Attack advantage only to Strength weapon and unarmed attack rolls", () => {
    const declared = declareRecklessAttack(barbarian2());
    expect(resolveAttackRollMode(declared, { ability: "str", type: "weapon attack" })).toMatchObject({ mode: "advantage", advantageSources: ["Reckless Attack"] });
    expect(resolveAttackRollMode(declared, { ability: "str", type: "unarmed strike" }).mode).toBe("advantage");
    expect(resolveAttackRollMode(declared, { ability: "dex", type: "weapon attack" }).mode).toBe("normal");
    expect(resolveAttackRollMode(declared, { ability: "str", type: "spell attack", isSpellAttack: true }).mode).toBe("normal");
    expect(resolveAttackRollMode(declared, { ability: "str", type: "weapon attack" }, { disadvantageSources: ["Prone"] }).mode).toBe("normal");
    expect(resolveAttackRollMode(declared, { ability: "str", type: "weapon attack" }, { advantageSources: ["Help"] }).mode).toBe("advantage");
    expect(resolveAttackRollMode(endRecklessAttack(declared), { ability: "str", type: "weapon attack" }).mode).toBe("normal");
  });
});
