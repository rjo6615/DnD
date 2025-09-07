/**
 * Core D&D 5e classes.
 * Simplified for API consumption.
 */
/** @typedef {import('../../types/class').Class} Class */
/** @type {Record<string, Class>} */
const classes = {
  barbarian: {
    name: 'Barbarian',
    hitDie: 12,
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      savingThrows: ['str', 'con'],
      skills: {
        count: 2,
        options: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
      },
    },
  },
  bard: {
    name: 'Bard',
    hitDie: 8,
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'hand-crossbow', 'longsword', 'rapier', 'shortsword'],
      tools: ['three musical instruments'],
      savingThrows: ['dex', 'cha'],
      skills: {
        count: 3,
        options: [
          'acrobatics',
          'animalHandling',
          'arcana',
          'athletics',
          'deception',
          'history',
          'insight',
          'intimidation',
          'investigation',
          'medicine',
          'nature',
          'perception',
          'performance',
          'persuasion',
          'religion',
          'sleightOfHand',
          'stealth',
          'survival',
        ],
      },
    },
    casterProgression: 'full',
  },
  cleric: {
    name: 'Cleric',
    hitDie: 8,
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      tools: [],
      savingThrows: ['wis', 'cha'],
      skills: {
        count: 2,
        options: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
      },
    },
    casterProgression: 'full',
  },
  druid: {
    name: 'Druid',
    hitDie: 8,
    proficiencies: {
      armor: ['light (non-metal)', 'medium (non-metal)', 'shields (non-metal)'],
      weapons: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'],
      tools: ['herbalism kit'],
      savingThrows: ['int', 'wis'],
      skills: {
        count: 2,
        options: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
      },
    },
    casterProgression: 'full',
  },
  fighter: {
    name: 'Fighter',
    hitDie: 10,
    proficiencies: {
      armor: ['all armor', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      savingThrows: ['str', 'con'],
      skills: {
        count: 2,
        options: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
      },
    },
  },
  monk: {
    name: 'Monk',
    hitDie: 8,
    proficiencies: {
      armor: [],
      weapons: ['simple', 'shortsword'],
      tools: ['one type of artisan tools or instrument'],
      savingThrows: ['str', 'dex'],
      skills: {
        count: 2,
        options: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
      },
    },
  },
  paladin: {
    name: 'Paladin',
    hitDie: 10,
    proficiencies: {
      armor: ['all armor', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      savingThrows: ['wis', 'cha'],
      skills: {
        count: 2,
        options: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
      },
    },
    casterProgression: 'half',
  },
  ranger: {
    name: 'Ranger',
    hitDie: 10,
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      savingThrows: ['str', 'dex'],
      skills: {
        count: 3,
        options: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
      },
    },
    casterProgression: 'half',
  },
  rogue: {
    name: 'Rogue',
    hitDie: 8,
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'hand-crossbow', 'longsword', 'rapier', 'shortsword'],
      tools: ['thieves tools'],
      savingThrows: ['dex', 'int'],
      skills: {
        count: 4,
        options: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
      },
    },
  },
  sorcerer: {
    name: 'Sorcerer',
    hitDie: 6,
    proficiencies: {
      armor: [],
      weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light-crossbow'],
      tools: [],
      savingThrows: ['con', 'cha'],
      skills: {
        count: 2,
        options: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
      },
    },
    casterProgression: 'full',
  },
  warlock: {
    name: 'Warlock',
    hitDie: 8,
    proficiencies: {
      armor: ['light'],
      weapons: ['simple'],
      tools: [],
      savingThrows: ['wis', 'cha'],
      skills: {
        count: 2,
        options: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
      },
    },
    casterProgression: 'full',
  },
  wizard: {
    name: 'Wizard',
    hitDie: 6,
    proficiencies: {
      armor: [],
      weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light-crossbow'],
      tools: [],
      savingThrows: ['int', 'wis'],
      skills: {
        count: 2,
        options: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
      },
    },
    casterProgression: 'full',
  },
};

module.exports = classes;
