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
    spellcasting: false,
  },
  bard: {
    name: 'Bard',
    hitDie: 8,
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'handCrossbows', 'longswords', 'rapiers', 'shortswords'],
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
    spellcasting: true,
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
    spellcasting: true,
  },
  druid: {
    name: 'Druid',
    hitDie: 8,
    proficiencies: {
      armor: ['light (non-metal)', 'medium (non-metal)', 'shields (non-metal)'],
      weapons: ['clubs', 'daggers', 'darts', 'javelins', 'maces', 'quarterstaffs', 'scimitars', 'sickles', 'slings', 'spears'],
      tools: ['herbalism kit'],
      savingThrows: ['int', 'wis'],
      skills: {
        count: 2,
        options: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
      },
    },
    spellcasting: true,
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
    spellcasting: false,
  },
  monk: {
    name: 'Monk',
    hitDie: 8,
    proficiencies: {
      armor: [],
      weapons: ['simple', 'shortswords'],
      tools: ['one type of artisan tools or instrument'],
      savingThrows: ['str', 'dex'],
      skills: {
        count: 2,
        options: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
      },
    },
    spellcasting: false,
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
    spellcasting: true,
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
    spellcasting: true,
  },
  rogue: {
    name: 'Rogue',
    hitDie: 8,
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'handCrossbows', 'longswords', 'rapiers', 'shortswords'],
      tools: ['thieves tools'],
      savingThrows: ['dex', 'int'],
      skills: {
        count: 4,
        options: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
      },
    },
    spellcasting: false,
  },
  sorcerer: {
    name: 'Sorcerer',
    hitDie: 6,
    proficiencies: {
      armor: [],
      weapons: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light crossbows'],
      tools: [],
      savingThrows: ['con', 'cha'],
      skills: {
        count: 2,
        options: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
      },
    },
    spellcasting: true,
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
    spellcasting: true,
  },
  wizard: {
    name: 'Wizard',
    hitDie: 6,
    proficiencies: {
      armor: [],
      weapons: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light crossbows'],
      tools: [],
      savingThrows: ['int', 'wis'],
      skills: {
        count: 2,
        options: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
      },
    },
    spellcasting: true,
  },
};

module.exports = classes;
