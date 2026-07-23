import { calculateCharacterArmorClass, calculateCharacterHitPoints, calculateCharacterMovementSpeed, resolveCombatantArmorClass } from './characterMetrics';

describe('calculateCharacterHitPoints', () => {
  it('calculates current and max hp using con and level', () => {
    const character = {
      health: 10,
      tempHealth: 8,
      con: 14,
      occupation: [{ Level: 1 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result).toEqual({ currentHp: 8, maxHp: 12 });
  });

  it('includes feat bonuses when available', () => {
    const character = {
      health: 20,
      tempHealth: '35',
      con: 16,
      occupation: [{ Level: 3 }],
      feat: [{ hpMaxBonus: 5, hpMaxBonusPerLevel: 2 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result).toEqual({ currentHp: 35, maxHp: 40 });
  });

  it('includes race hp bonuses when present', () => {
    const character = {
      health: 24,
      tempHealth: 24,
      con: 14,
      occupation: [{ Level: 2 }, { Level: 1 }],
      race: { name: 'Dwarf', hpMaxBonusPerLevel: 1 },
    };

    const result = calculateCharacterHitPoints(character);

    // Base 24 + (Con mod 2 * 3 levels) + 1 per level racial bonus
    expect(result).toEqual({ currentHp: 24, maxHp: 33 });
  });

  it('respects override values when provided', () => {
    const character = {
      health: 1,
      tempHealth: 0,
      occupation: [],
    };

    const result = calculateCharacterHitPoints(character, {
      baseHealth: 15,
      currentHp: 9,
      conMod: 4,
      totalLevel: 2,
      hpMaxBonus: 3,
      hpMaxBonusPerLevel: 1,
    });

    expect(result).toEqual({ currentHp: 9, maxHp: 28 });
  });

  it('returns nulls when data is missing', () => {
    const result = calculateCharacterHitPoints({}, {});

    expect(result).toEqual({ currentHp: null, maxHp: null });
  });

  it('does not default current hp to base health when no explicit value exists', () => {
    const character = {
      health: 30,
      con: 10,
      occupation: [{ Level: 3 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result.currentHp).toBeNull();
    expect(result.maxHp).toBe(30);
  });

  it('uses character.currentHp when provided', () => {
    const character = {
      health: 12,
      tempHealth: 4,
      currentHp: '9',
      con: 10,
      occupation: [{ Level: 1 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result.currentHp).toBe(9);
  });

  it('uses character.hpCurrent when provided', () => {
    const character = {
      health: 15,
      tempHealth: 5,
      hpCurrent: 11,
      con: 10,
      occupation: [{ Level: 1 }],
    };

    const result = calculateCharacterHitPoints(character);

    expect(result.currentHp).toBe(11);
  });

  it('derives con modifier and hp bonuses from equipped items', () => {
    const baseCharacter = {
      health: 10,
      con: 10,
      occupation: [{ Level: 2 }],
      equipment: {},
    };

    const equippedCharacter = {
      ...baseCharacter,
      equipment: {
        head: {
          name: 'Helm of Vitality',
          statBonuses: { con: 4 },
          hpMaxBonus: 5,
          numericBonuses: { hpMaxBonusPerLevel: 1 },
        },
      },
    };

    const baseResult = calculateCharacterHitPoints(baseCharacter);
    const equippedResult = calculateCharacterHitPoints(equippedCharacter);

    expect(baseResult.maxHp).toBe(10);

    const expectedConMod = Math.floor(((baseCharacter.con + 4) - 10) / 2);
    const totalLevel = baseCharacter.occupation.reduce((sum, entry) => sum + Number(entry.Level), 0);
    const expectedMaxHp =
      baseCharacter.health +
      expectedConMod * totalLevel +
      5 +
      1 * totalLevel;

    expect(equippedResult.maxHp).toBe(expectedMaxHp);
    expect(equippedResult.maxHp - baseResult.maxHp).toBe(
      expectedConMod * totalLevel + 5 + totalLevel
    );
  });

  it('ignores hp bonuses from explicitly unowned accessories', () => {
    const character = {
      health: 12,
      con: 12,
      occupation: [{ Level: 2 }],
      accessories: [
        { statBonuses: { con: 6 }, hpMaxBonus: 20, owned: false },
        { hpMaxBonusPerLevel: 2, owned: false },
      ],
    };

    const result = calculateCharacterHitPoints(character);

    const expectedConMod = Math.floor((character.con - 10) / 2);
    const totalLevel = character.occupation.reduce(
      (sum, entry) => sum + Number(entry.Level),
      0
    );

    expect(result.maxHp).toBe(character.health + expectedConMod * totalLevel);
  });
});


describe('calculateCharacterArmorClass barbarian unarmored defense', () => {
  const base = { dex: 14, con: 16, wis: 18, occupation: [{ Name: 'Barbarian', Level: 1 }] };
  const requestedBase = { dex: 16, con: 16, occupation: [{ Name: 'Barbarian', Level: 1 }] };

  it('uses 10 + dex + con while unarmored and ignores owned inventory armor', () => {
    expect(calculateCharacterArmorClass(base)).toBe(15);
    expect(calculateCharacterArmorClass(requestedBase)).toBe(16);
    expect(calculateCharacterArmorClass({ ...requestedBase, armor: [{ name: 'Leather', category: 'Light Armor', source: 'armor', acBonus: 1, owned: true }] })).toBe(16);
    expect(calculateCharacterArmorClass({ ...requestedBase, armor: [{ name: 'Leather', category: 'Light Armor', source: 'armor', acBonus: 1 }, { name: 'Plate', category: 'Heavy Armor', source: 'armor', acBonus: 8, maxDex: 0 }] })).toBe(16);
    expect(calculateCharacterArmorClass({ ...requestedBase, armor: [{ name: 'Shield', category: 'Shield', acBonus: 2 }] })).toBe(16);
  });

  it('only applies explicitly equipped armor and shields', () => {
    expect(calculateCharacterArmorClass({ ...base, equipment: { chest: { name: 'Leather', category: 'Light Armor', source: 'armor', acBonus: 1 } } })).toBe(13);
    expect(calculateCharacterArmorClass({ ...requestedBase, equipment: { chest: { name: 'Leather', category: 'Light Armor', source: 'armor', acBonus: 1 } } })).toBe(14);
    expect(calculateCharacterArmorClass({ ...base, equipment: { chest: { name: 'Hide', category: 'Medium Armor', source: 'armor', acBonus: 2, maxDex: 2 } } })).toBe(14);
    expect(calculateCharacterArmorClass({ ...base, equipment: { chest: { name: 'Plate', category: 'Heavy Armor', source: 'armor', acBonus: 8, maxDex: 0 } } })).toBe(20);
    expect(calculateCharacterArmorClass({ ...requestedBase, equipment: { offHand: { name: 'Shield', category: 'Shield', source: 'armor', acBonus: 2 } } })).toBe(18);
    expect(calculateCharacterArmorClass({ ...base, occupation: [{ Name: 'Barbarian', Level: 1 }, { Name: 'Monk', Level: 1 }] })).toBe(16);
  });

  it('restores unarmored defense when armor is unequipped while inventory persists', () => {
    const leather = { name: 'Leather', category: 'Light Armor', source: 'armor', acBonus: 1, owned: true };
    const equipped = { ...requestedBase, armor: [leather], equipment: { chest: leather } };
    expect(calculateCharacterArmorClass(equipped)).toBe(14);
    expect(calculateCharacterArmorClass({ ...equipped, equipment: { chest: null } })).toBe(16);
  });
});

describe('resolveCombatantArmorClass', () => {
  it('uses the canonical character calculation instead of a persisted AC summary', () => {
    const barbarian = {
      entityType: 'character',
      armorClass: 10,
      dex: 14,
      con: 16,
      occupation: [{ Name: 'Barbarian', Level: 1 }],
    };

    expect(resolveCombatantArmorClass(barbarian)).toBe(15);
  });

  it('normalizes monster AC records used by map combatants', () => {
    expect(resolveCombatantArmorClass({ entityType: 'enemy', armorClass: [{ value: 13 }] })).toBe(13);
    expect(resolveCombatantArmorClass({ entityType: 'monster', ac: 17 })).toBe(17);
  });

  it('returns null when a monster genuinely has no AC', () => {
    expect(resolveCombatantArmorClass({ entityType: 'enemy', name: 'Illusion' })).toBeNull();
  });
});


describe('calculateCharacterMovementSpeed', () => {
  it('uses base character speed plus centralized derived speed modifiers', () => {
    const character = {
      speed: 30,
      feat: [{ speed: 5 }],
      equipment: { feet: { name: 'Boots of Pace', speedBonus: 5 } },
      conditions: [{ name: 'Slowed', movementSpeedBonus: -10 }],
    };

    expect(calculateCharacterMovementSpeed(character)).toBe(30);
  });

  it('clamps reduced movement at zero feet', () => {
    expect(calculateCharacterMovementSpeed({ speed: 25, conditions: [{ speedBonus: -40 }] })).toBe(0);
  });

  it('applies Barbarian Fast Movement starting at Barbarian level 5', () => {
    const base = { speed: 30, equipment: {} };

    expect(calculateCharacterMovementSpeed({ ...base, occupation: [{ Name: 'Barbarian', Level: 4 }] })).toBe(30);
    expect(calculateCharacterMovementSpeed({ ...base, occupation: [{ Name: 'Barbarian', Level: 5 }] })).toBe(40);
    expect(calculateCharacterMovementSpeed({ ...base, occupation: [{ Name: 'Barbarian', Level: 10 }] })).toBe(40);
  });

  it('suppresses Barbarian Fast Movement only while heavy armor is equipped', () => {
    const base = { speed: 30, occupation: [{ Name: 'Barbarian', Level: 5 }] };
    const lightArmor = { name: 'Leather', category: 'Light Armor', source: 'armor' };
    const mediumArmor = { name: 'Hide', category: 'Medium Armor', source: 'armor' };
    const heavyArmor = { name: 'Plate', category: 'Heavy Armor', source: 'armor' };

    expect(calculateCharacterMovementSpeed({ ...base, equipment: {} })).toBe(40);
    expect(calculateCharacterMovementSpeed({ ...base, equipment: { chest: lightArmor } })).toBe(40);
    expect(calculateCharacterMovementSpeed({ ...base, equipment: { chest: mediumArmor } })).toBe(40);
    expect(calculateCharacterMovementSpeed({ ...base, equipment: { chest: heavyArmor } })).toBe(30);
    expect(calculateCharacterMovementSpeed({ ...base, equipment: { chest: null }, armor: [heavyArmor] })).toBe(40);
  });

  it('uses armor classification rather than item name for Fast Movement heavy armor checks', () => {
    const character = { speed: 30, occupation: [{ Name: 'Barbarian', Level: 5 }] };

    expect(calculateCharacterMovementSpeed({
      ...character,
      equipment: { chest: { name: 'Ceremonial Plate', category: 'Light Armor', source: 'armor' } },
    })).toBe(40);
    expect(calculateCharacterMovementSpeed({
      ...character,
      equipment: { chest: { name: 'Silken Robe', armorType: 'Heavy Armor', source: 'armor' } },
    })).toBe(30);
  });

  it('applies Barbarian Fast Movement based only on Barbarian levels when multiclassed', () => {
    const base = { speed: 30, equipment: {} };

    expect(calculateCharacterMovementSpeed({
      ...base,
      occupation: [{ Name: 'Barbarian', Level: 5 }, { Name: 'Fighter', Level: 5 }],
    })).toBe(40);
    expect(calculateCharacterMovementSpeed({
      ...base,
      occupation: [{ Name: 'Barbarian', Level: 4 }, { Name: 'Fighter', Level: 10 }],
    })).toBe(30);
    expect(calculateCharacterMovementSpeed({
      ...base,
      occupation: [{ Name: 'Barbarian', Level: 8 }, { Name: 'Rogue', Level: 5 }],
    })).toBe(40);
  });

  it('stacks Barbarian Fast Movement with existing centralized movement bonuses', () => {
    const character = {
      speed: 30,
      occupation: [{ Name: 'Barbarian', Level: 5 }],
      feat: [{ speed: 5 }],
      equipment: { feet: { name: 'Boots of Pace', speedBonus: 5 } },
      conditions: [{ name: 'Slowed', movementSpeedBonus: -10 }],
    };

    expect(calculateCharacterMovementSpeed(character)).toBe(40);
  });

  it('recalculates Fast Movement after save/load, armor changes, and Barbarian level changes', () => {
    const heavyArmor = { name: 'Plate', category: 'Heavy Armor', source: 'armor' };
    const levelFour = { speed: 30, occupation: [{ Name: 'Barbarian', Level: 4 }], equipment: {} };
    const levelFive = { ...levelFour, occupation: [{ Name: 'Barbarian', Level: 5 }] };
    const savedAndLoaded = JSON.parse(JSON.stringify(levelFive));

    expect(calculateCharacterMovementSpeed(levelFour)).toBe(30);
    expect(calculateCharacterMovementSpeed(levelFive)).toBe(40);
    expect(calculateCharacterMovementSpeed(savedAndLoaded)).toBe(40);
    expect(calculateCharacterMovementSpeed({ ...levelFive, equipment: { chest: heavyArmor } })).toBe(30);
    expect(calculateCharacterMovementSpeed({ ...levelFive, equipment: { chest: null } })).toBe(40);
  });
});
