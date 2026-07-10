import {
  activateRage,
  applyRageRest,
  endRage,
  getBarbarianProgression,
  getRageBenefits,
  getRageDamageBonus,
  getRageState,
  isEligibleBarbarianWeaponMastery,
  validateBarbarianWeaponMasteries,
  getWeaponMasteryState,
  setWeaponMasterySelections,
  replaceWeaponMasteryAfterLongRest,
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
