const races = {
  human: {
    name: "Human",
    size: "Medium",
    sizeOptions: ["Medium", "Small"],
    speed: 30,
    abilities: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    skills: {},
    languages: ["Common", "Choice"],
  },
  dwarf: {
    name: "Dwarf",
    size: "Medium",
    sizeOptions: ["Medium"],
    speed: 30,
    abilities: { con: 2 },
    skills: {},
    languages: ["Common", "Dwarvish"],
    darkvisionRange: 120,
    resistances: ["Poison"],
    hpMaxBonusPerLevel: 1,
    weaponProficiencies: [
      "battleaxe",
      "handaxe",
      "light-hammer",
      "warhammer",
    ],
  },
  elf: {
    name: "Elf",
    size: "Medium",
    sizeOptions: ["Medium"],
    speed: 30,
    abilities: { dex: 2 },
    skills: { perception: { proficient: true } },
    skillChoices: {
      count: 1,
      options: ["insight", "perception", "survival"],
      description: "Choose one of Insight, Perception, or Survival to gain proficiency in.",
    },
    languages: ["Common", "Elvish"],
    darkvisionRange: 60,
    weaponProficiencies: [
      "longsword",
      "shortsword",
      "shortbow",
      "longbow",
    ],
    elvenLineages: {
      drow: {
        label: "Drow",
        description:
          "You know the Dancing Lights cantrip. Starting at 3rd level, you can also cast Faerie Fire once per long rest, and starting at 5th level, you can cast Darkness once per long rest.",
        spellcastingAbilities: ["Intelligence", "Wisdom", "Charisma"],
        abilities: { cha: 1 },
        darkvisionRange: 120,
        level1Feature:
          "You know the Dancing Lights cantrip. You can cast it without expending a spell slot.",
        level3Feature:
          "At 3rd level, you can cast Faerie Fire with this trait once per long rest.",
        level5Feature:
          "At 5th level, you can cast Darkness with this trait once per long rest.",
      },
      high: {
        label: "High Elf",
        description:
          "You know the Prestidigitation cantrip. Starting at 3rd level, you can also cast Detect Magic once per long rest, and starting at 5th level, you can cast Misty Step once per long rest.",
        spellcastingAbilities: ["Intelligence", "Wisdom", "Charisma"],
        abilities: { int: 1 },
        level1Feature:
          "You know the Prestidigitation cantrip. You can cast it without expending a spell slot.",
        level3Feature:
          "At 3rd level, you can cast Detect Magic with this trait once per long rest.",
        level5Feature:
          "At 5th level, you can cast Misty Step with this trait once per long rest.",
      },
      wood: {
        label: "Wood Elf",
        description:
          "You know the Druidcraft cantrip. Starting at 3rd level, you can also cast Longstrider once per long rest, and starting at 5th level, you can cast Pass without Trace once per long rest.",
        spellcastingAbilities: ["Intelligence", "Wisdom", "Charisma"],
        abilities: { wis: 1 },
        speed: 35,
        level1Feature:
          "You know the Druidcraft cantrip. You can cast it without expending a spell slot.",
        level3Feature:
          "At 3rd level, you can cast Longstrider with this trait once per long rest.",
        level5Feature:
          "At 5th level, you can cast Pass without Trace with this trait once per long rest.",
      },
    },
  },
  halfling: {
    name: "Halfling",
    size: "Small",
    sizeOptions: ["Small"],
    speed: 30,
    creatureType: "Humanoid",
    abilities: { dex: 2 },
    skills: {},
    languages: ["Common", "Halfling"],
  },
  dragonborn: {
    name: "Dragonborn",
    size: "Medium",
    sizeOptions: ["Medium"],
    speed: 30,
    abilities: { str: 2, cha: 1 },
    skills: {},
    languages: ["Common", "Draconic"],
    darkvisionRange: 60,
    dragonAncestries: {
      black: {
        label: "Black (Acid)",
        damageType: "Acid",
        breathWeapon: { shape: "5 by 30 ft. line", save: "Dexterity" },
        moralAlignment: "evil",
      },
      blue: {
        label: "Blue (Lightning)",
        damageType: "Lightning",
        breathWeapon: { shape: "5 by 30 ft. line", save: "Dexterity" },
        moralAlignment: "evil",
      },
      brass: {
        label: "Brass (Fire)",
        damageType: "Fire",
        breathWeapon: { shape: "5 by 30 ft. line", save: "Dexterity" },
        moralAlignment: "good",
      },
      bronze: {
        label: "Bronze (Lightning)",
        damageType: "Lightning",
        breathWeapon: { shape: "5 by 30 ft. line", save: "Dexterity" },
        moralAlignment: "good",
      },
      copper: {
        label: "Copper (Acid)",
        damageType: "Acid",
        breathWeapon: { shape: "5 by 30 ft. line", save: "Dexterity" },
        moralAlignment: "good",
      },
      gold: {
        label: "Gold (Fire)",
        damageType: "Fire",
        breathWeapon: { shape: "15 ft. cone", save: "Dexterity" },
        moralAlignment: "good",
      },
      green: {
        label: "Green (Poison)",
        damageType: "Poison",
        breathWeapon: { shape: "15 ft. cone", save: "Constitution" },
        moralAlignment: "evil",
      },
      red: {
        label: "Red (Fire)",
        damageType: "Fire",
        breathWeapon: { shape: "15 ft. cone", save: "Dexterity" },
        moralAlignment: "evil",
      },
      silver: {
        label: "Silver (Cold)",
        damageType: "Cold",
        breathWeapon: { shape: "15 ft. cone", save: "Constitution" },
        moralAlignment: "good",
      },
      white: {
        label: "White (Cold)",
        damageType: "Cold",
        breathWeapon: { shape: "15 ft. cone", save: "Constitution" },
        moralAlignment: "evil",
      },
    },
  },
  gnome: {
    name: "Gnome",
    size: "Small",
    sizeOptions: ["Small"],
    speed: 30,
    abilities: { int: 2 },
    skills: {},
    languages: ["Common", "Gnomish"],
    creatureType: "Humanoid",
    darkvisionRange: 60,
    gnomeLineages: {
      forest: {
        label: "Forest Gnome",
        description:
          "You know the Minor Illusion cantrip. Starting at 3rd level, you can also cast Speak with Animals with this trait once per long rest.",
        spells: [
          {
            name: "Minor Illusion",
            description:
              "Create a sound or an image of an object within range that lasts for the duration.",
            usage: "At will",
          },
          {
            name: "Speak with Animals",
            description:
              "You gain the ability to comprehend and verbally communicate with beasts for the duration.",
            usage: "1/long rest",
          },
        ],
        spellcastingAbilities: ["Intelligence", "Wisdom"],
      },
      rock: {
        label: "Rock Gnome",
        description:
          "You know the Mending and Prestidigitation cantrips. Whenever you finish a long rest, you can spend 10 minutes to create a Tiny clockwork device (AC 5, 1 hp). The device ceases to function after 24 hours (unless you spend 1 minute repairing it), when you use this trait again, or when you take an action to dismantle it; at that time, you can reclaim the materials used to create it.",
        spells: [
          {
            name: "Mending",
            description:
              "You know the Mending cantrip, allowing you to repair a break or tear in an object you touch.",
            usage: "At will",
          },
          {
            name: "Prestidigitation",
            description:
              "You know the Prestidigitation cantrip, letting you create minor magical effects. Additionally, whenever you finish a long rest, you can spend 10 minutes to create a Tiny clockwork device (AC 5, 1 hp). The device ceases to function after 24 hours (unless you spend 1 minute repairing it), when you use this trait again, or when you take an action to dismantle it; at that time, you can reclaim the materials used to create it.",
            usage: "At will",
          },
        ],
        spellcastingAbilities: ["Intelligence"],
      },
    },
  },
  orc: {
    name: "Orc",
    size: "Medium",
    sizeOptions: ["Medium"],
    speed: 30,
    abilities: { str: 2, con: 1 },
    skills: { intimidation: { proficient: true } },
    languages: ["Common", "Orc"],
    darkvisionRange: 120,
  },
  tiefling: {
    name: "Tiefling",
    size: "Medium",
    sizeOptions: ["Medium", "Small"],
    speed: 30,
    abilities: { cha: 2, int: 1 },
    skills: {},
    languages: ["Common", "Infernal"],
    creatureType: "Humanoid",
    darkvisionRange: 60,
    fiendishLegacies: {
      abyssal: {
        label: "Abyssal",
        description:
          "You channel the chaotic corruption of the Abyss, gaining resistances and magic steeped in poison.",
        resistance: "Poison",
        spellcastingAbilities: ["Intelligence", "Wisdom", "Charisma"],
        spells: [
          {
            name: "Poison Spray",
            spellLevel: "Cantrip",
            unlockedAtLevel: 1,
            description:
              "Project a puff of noxious gas toward a creature you can see, forcing it to make a Constitution save or take poison damage.",
            usage: "At will",
          },
          {
            name: "Ray of Sickness",
            spellLevel: "1st-level",
            unlockedAtLevel: 3,
            description:
              "Hurl a ray of sickening energy that can poison a creature on a failed Constitution save.",
            usage: "1/long rest",
          },
          {
            name: "Hold Person",
            spellLevel: "2nd-level",
            unlockedAtLevel: 5,
            description:
              "Paralyze a humanoid you can see within range unless it succeeds on a Wisdom save.",
            usage: "1/long rest",
          },
        ],
      },
      chthonic: {
        label: "Chthonic",
        description:
          "Your legacy is tied to dark powers of the Lower Planes, cloaking you in necrotic energies and shadowed magic.",
        resistance: "Necrotic",
        spellcastingAbilities: ["Intelligence", "Wisdom", "Charisma"],
        spells: [
          {
            name: "Chill Touch",
            spellLevel: "Cantrip",
            unlockedAtLevel: 1,
            description:
              "Create a ghostly skeletal hand that clings to a creature, dealing necrotic damage and hampering its healing.",
            usage: "At will",
          },
          {
            name: "False Life",
            spellLevel: "1st-level",
            unlockedAtLevel: 3,
            description:
              "Bolster yourself with necromantic vitality, gaining temporary hit points for the duration.",
            usage: "1/long rest",
          },
          {
            name: "Ray of Enfeeblement",
            spellLevel: "2nd-level",
            unlockedAtLevel: 5,
            description:
              "Sap a creature's strength with a weakening ray, halving its weapon damage on a failed Constitution save.",
            usage: "1/long rest",
          },
        ],
      },
      infernal: {
        label: "Infernal",
        description:
          "You inherit the disciplined might of the Hells, wreathed in flame and armed with classic devilish magic.",
        resistance: "Fire",
        spellcastingAbilities: ["Intelligence", "Wisdom", "Charisma"],
        spells: [
          {
            name: "Fire Bolt",
            spellLevel: "Cantrip",
            unlockedAtLevel: 1,
            description:
              "Launch a mote of fire at a creature within range, dealing fire damage on a hit.",
            usage: "At will",
          },
          {
            name: "Hellish Rebuke",
            spellLevel: "1st-level",
            unlockedAtLevel: 3,
            description:
              "Surround an attacker in searing flame as a reaction, forcing a Dexterity save or dealing fire damage.",
            usage: "1/long rest",
          },
          {
            name: "Darkness",
            spellLevel: "2nd-level",
            unlockedAtLevel: 5,
            description:
              "Create a 15-foot-radius sphere of magical darkness that even darkvision can't penetrate.",
            usage: "1/long rest",
          },
        ],
      },
    },
  },
  goliath: {
    name: "Goliath",
    size: "Medium",
    sizeOptions: ["Medium"],
    speed: 35,
    abilities: { str: 2, con: 1 },
    skills: {},
    languages: ["Common", "Giant"],
    giantAncestries: {
      cloud: {
        label: "Cloud's Jaunt",
        ancestryName: "Cloud Giant",
        description:
          "As a bonus action, teleport up to 30 feet to an unoccupied space you can see.",
        usage: "Bonus action • Proficiency bonus per long rest",
      },
      fire: {
        label: "Fire's Burn",
        ancestryName: "Fire Giant",
        description:
          "When you hit a target, deal an extra 1d10 fire damage. The extra damage can be applied once per turn.",
        usage: "No action • Proficiency bonus per long rest",
      },
      frost: {
        label: "Frost's Chill",
        ancestryName: "Frost Giant",
        description:
          "When you hit a target, reduce its speed by 10 feet until the start of your next turn. The effect can be applied once per turn.",
        usage: "No action • Proficiency bonus per long rest",
      },
      hill: {
        label: "Hill's Tumble",
        ancestryName: "Hill Giant",
        description:
          "When you hit a Large or smaller target, it must succeed on a Strength save or be knocked prone.",
        usage: "No action • Proficiency bonus per long rest",
      },
      stone: {
        label: "Stone's Endurance",
        ancestryName: "Stone Giant",
        description:
          "As a reaction when you take damage, roll a d12 and add your Constitution modifier to reduce the incoming damage.",
        usage: "Reaction • Proficiency bonus per long rest",
      },
      storm: {
        label: "Storm's Thunder",
        ancestryName: "Storm Giant",
        description:
          "As a reaction when you take damage, force the attacker within 60 feet to make a Constitution save or take 1d8 thunder damage.",
        usage: "Reaction • Proficiency bonus per long rest",
      },
    },
  },
};

module.exports = races;
