// Mapping of class names to their features and spell progression.
// Each class maps to an object with `featuresByLevel` and optional spell data
// keyed by level.

/**
 * @typedef {{ name: string, description: string }} Feature
 * @typedef {{
 *   featuresByLevel: Record<number, Feature[]>,
 *   spellSlots?: Record<number, Record<number, number>>,
 *   spellsKnown?:
 *     | Record<number, number>
 *     | ((level: number, chaMod: number) => number),
 *   pactMagic?: Record<number, Record<number, number>>
 * }} ClassFeatures
 * @type {Record<string, ClassFeatures>}
 */

// Common feature used by many classes
const ASI = {
  name: 'Ability Score Improvement',
  description:
    'Increase one ability score of your choice by 2, or increase two ability scores by 1. You can’t increase an ability score above 20.'
};

// Spell slot progression tables
const fullCasterSlots = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
 10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
 11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
 12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
 13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
 14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
 15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
 16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
 17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
 18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
 19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
 20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }
};

const halfCasterSlots = {
  1: {},
  2: { 1: 2 },
  3: { 1: 3 },
  4: { 1: 3 },
  5: { 1: 4, 2: 2 },
  6: { 1: 4, 2: 2 },
  7: { 1: 4, 2: 3 },
  8: { 1: 4, 2: 3 },
  9: { 1: 4, 2: 3, 3: 2 },
 10: { 1: 4, 2: 3, 3: 2 },
 11: { 1: 4, 2: 3, 3: 3 },
 12: { 1: 4, 2: 3, 3: 3 },
 13: { 1: 4, 2: 3, 3: 3, 4: 1 },
 14: { 1: 4, 2: 3, 3: 3, 4: 1 },
 15: { 1: 4, 2: 3, 3: 3, 4: 2 },
 16: { 1: 4, 2: 3, 3: 3, 4: 2 },
 17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
 18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
 19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
 20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }
};

const pactMagic = {
  1: { 1: 1 },
  2: { 1: 2 },
  3: { 2: 2 },
  4: { 2: 2 },
  5: { 3: 2 },
  6: { 3: 2 },
  7: { 4: 2 },
  8: { 4: 2 },
  9: { 5: 2 },
 10: { 5: 2 },
 11: { 5: 3 },
 12: { 5: 3 },
 13: { 5: 3 },
 14: { 5: 3 },
 15: { 5: 3 },
 16: { 5: 3 },
 17: { 5: 4 },
 18: { 5: 4 },
 19: { 5: 4 },
  20: { 5: 4 }
};

// Spells known tables
function paladinSpellsKnown(level, chaMod) {
  return Math.max(1, Math.floor(level / 2) + chaMod);
}
const bardSpellsKnown = {
  1: 4,
  2: 5,
  3: 6,
  4: 7,
  5: 8,
  6: 9,
  7: 10,
  8: 11,
  9: 12,
 10: 14,
 11: 15,
 12: 15,
 13: 16,
 14: 18,
 15: 19,
 16: 19,
 17: 20,
 18: 22,
 19: 22,
 20: 22
};

const rangerSpellsKnown = {
  1: 0,
  2: 2,
  3: 3,
  4: 3,
  5: 4,
  6: 4,
  7: 5,
  8: 5,
  9: 6,
 10: 6,
 11: 7,
 12: 7,
 13: 8,
 14: 8,
 15: 9,
 16: 9,
 17: 10,
 18: 10,
 19: 11,
 20: 12
};

const sorcererSpellsKnown = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
 10: 11,
 11: 12,
 12: 12,
 13: 13,
 14: 13,
 15: 14,
 16: 14,
 17: 15,
 18: 15,
 19: 15,
 20: 15
};

const warlockSpellsKnown = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
 10: 10,
 11: 11,
 12: 11,
 13: 12,
 14: 12,
 15: 13,
 16: 13,
 17: 14,
 18: 14,
 19: 15,
 20: 15
};

const wizardSpellsKnown = {};
for (let i = 1; i <= 20; i += 1) {
  wizardSpellsKnown[i] = 6 + (i - 1) * 2;
}

// Feature tables for each class
const barbarianFeatures = {
  1: [
    {
      name: 'Rage',
      description: 'In battle, you fight with primal ferocity.'
    },
    {
      name: 'Unarmored Defense',
      description: 'While not wearing armor, your AC equals 10 + your Dex modifier + your Con modifier.'
    }
  ],
  2: [
    {
      name: 'Reckless Attack',
      description: 'You can throw aside all concern for defense to attack with fierce desperation.'
    },
    {
      name: 'Danger Sense',
      description: 'You have advantage on Dex saving throws against effects you can see.'
    }
  ],
  3: [
    {
      name: 'Primal Path',
      description: 'You choose a path that shapes the nature of your rage.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Extra Attack',
      description:
        'You can attack twice, instead of once, whenever you take the Attack action on your turn.'
    },
    {
      name: 'Fast Movement',
      description: 'Your speed increases by 10 feet while you aren’t wearing heavy armor.'
    }
  ],
  6: [
    {
      name: 'Primal Path feature',
      description: 'Your chosen path grants you an additional feature.'
    }
  ],
  7: [
    {
      name: 'Feral Instinct',
      description: 'You have advantage on initiative rolls.'
    }
  ],
  8: [ASI],
  9: [
    {
      name: 'Brutal Critical (1 die)',
      description:
        'You can roll one additional weapon damage die when determining the extra damage for a critical hit.'
    }
  ],
 10: [
    {
      name: 'Primal Path feature',
      description: 'Your chosen path grants you an additional feature.'
    }
  ],
 11: [
    {
      name: 'Relentless Rage',
      description: 'Your rage can keep you fighting despite grievous wounds.'
    }
  ],
 12: [ASI],
 13: [
    {
      name: 'Brutal Critical (2 dice)',
      description:
        'You can roll two additional weapon damage dice when determining the extra damage for a critical hit.'
    }
  ],
 14: [
    {
      name: 'Primal Path feature',
      description: 'Your chosen path grants you an additional feature.'
    }
  ],
 15: [
    {
      name: 'Persistent Rage',
      description: 'Your rage ends early only if you fall unconscious or if you choose to end it.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Brutal Critical (3 dice)',
      description:
        'You can roll three additional weapon damage dice when determining the extra damage for a critical hit.'
    }
  ],
 18: [
    {
      name: 'Indomitable Might',
      description:
        'If your total for a Strength check is less than your Strength score, you can use that score in place of the total.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Primal Champion',
      description: 'Your Strength and Constitution scores increase by 4; their maximum is now 24.'
    }
  ]
};

const bardFeatures = {
  1: [
    {
      name: 'Spellcasting',
      description:
        'You have learned to reshape the fabric of reality in harmony with your wishes and music.'
    },
    {
      name: 'Bardic Inspiration (d6)',
      description: 'You can inspire others through stirring words or music.'
    }
  ],
  2: [
    {
      name: 'Jack of All Trades',
      description:
        'Add half your proficiency bonus, rounded down, to any ability check you make that doesn’t already include your proficiency bonus.'
    },
    {
      name: 'Song of Rest (d6)',
      description:
        'You can use soothing music or oration to help revitalize your wounded allies during a short rest.'
    }
  ],
  3: [
    {
      name: 'Bard College',
      description: 'You delve into the advanced techniques of a bardic college.'
    },
    {
      name: 'Expertise',
      description:
        'Choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Bardic Inspiration (d8)',
      description: 'Your Bardic Inspiration die becomes a d8.'
    },
    {
      name: 'Font of Inspiration',
      description:
        'You regain all expended uses of Bardic Inspiration when you finish a short or long rest.'
    }
  ],
  6: [
    {
      name: 'Countercharm',
      description:
        'You can use musical notes or words of power to disrupt mind-influencing effects.'
    },
    {
      name: 'Bard College feature',
      description: 'Your bard college grants you an additional feature.'
    }
  ],
  7: [],
  8: [ASI],
  9: [
    {
      name: 'Song of Rest (d8)',
      description: 'Your Song of Rest die becomes a d8.'
    }
  ],
 10: [
    {
      name: 'Bardic Inspiration (d10)',
      description: 'Your Bardic Inspiration die becomes a d10.'
    },
    {
      name: 'Expertise',
      description: 'You choose two more skills to gain Expertise in.'
    },
    {
      name: 'Magical Secrets',
      description: 'You learn two spells of your choice from any class.'
    }
  ],
 11: [],
 12: [ASI],
 13: [
    {
      name: 'Song of Rest (d10)',
      description: 'Your Song of Rest die becomes a d10.'
    }
  ],
 14: [
    {
      name: 'Magical Secrets',
      description: 'You learn two more spells of your choice from any class.'
    },
    {
      name: 'Bard College feature',
      description: 'Your bard college grants you an additional feature.'
    }
  ],
 15: [
    {
      name: 'Bardic Inspiration (d12)',
      description: 'Your Bardic Inspiration die becomes a d12.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Song of Rest (d12)',
      description: 'Your Song of Rest die becomes a d12.'
    }
  ],
 18: [
    {
      name: 'Magical Secrets',
      description: 'You learn two more spells of your choice from any class.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Superior Inspiration',
      description:
        'When you roll initiative and have no uses of Bardic Inspiration left, you regain one use.'
    }
  ]
};

const clericFeatures = {
  1: [
    {
      name: 'Spellcasting',
      description: 'You have learned to cast cleric spells.'
    },
    {
      name: 'Divine Domain',
      description: 'You choose a domain that shapes your practice of the divine arts.'
    }
  ],
  2: [
    {
      name: 'Channel Divinity (1/rest)',
      description: 'You can channel divine energy to fuel magical effects.'
    },
    {
      name: 'Channel Divinity: Turn Undead',
      description:
        'As an action, you present your holy symbol and speak a prayer censuring the undead.'
    }
  ],
  3: [
    {
      name: 'Domain feature',
      description: 'Your divine domain grants you an additional feature.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Destroy Undead (CR 1/2)',
      description:
        'When an undead fails its saving throw against your Turn Undead feature, it is destroyed if its challenge rating is 1/2 or lower.'
    }
  ],
  6: [
    {
      name: 'Channel Divinity (2/rest)',
      description: 'You can use Channel Divinity twice between rests.'
    },
    {
      name: 'Domain feature',
      description: 'Your divine domain grants you an additional feature.'
    }
  ],
  7: [],
  8: [ASI,
    {
      name: 'Destroy Undead (CR 1)',
      description: 'Destroy undead of CR 1 or lower when they fail their save against Turn Undead.'
    }
  ],
  9: [],
 10: [
    {
      name: 'Divine Intervention',
      description:
        'You can call on your deity to intervene on your behalf when your need is great.'
    }
  ],
 11: [
    {
      name: 'Destroy Undead (CR 2)',
      description: 'Destroy undead of CR 2 or lower when they fail their save against Turn Undead.'
    }
  ],
 12: [ASI],
 13: [],
 14: [
    {
      name: 'Destroy Undead (CR 3)',
      description: 'Destroy undead of CR 3 or lower when they fail their save against Turn Undead.'
    }
  ],
 15: [],
 16: [ASI],
 17: [
    {
      name: 'Destroy Undead (CR 4)',
      description: 'Destroy undead of CR 4 or lower when they fail their save against Turn Undead.'
    },
    {
      name: 'Domain feature',
      description: 'Your divine domain grants you an additional feature.'
    }
  ],
 18: [
    {
      name: 'Channel Divinity (3/rest)',
      description: 'You can use Channel Divinity three times between rests.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Divine Intervention Improvement',
      description: 'Your Divine Intervention automatically succeeds, no roll required.'
    }
  ]
};

const druidFeatures = {
  1: [
    {
      name: 'Druidic',
      description: 'You know Druidic, the secret language of druids.'
    },
    {
      name: 'Spellcasting',
      description: 'You can cast druid spells.'
    }
  ],
  2: [
    {
      name: 'Wild Shape',
      description:
        'You can magically assume the shape of a beast that you have seen before.'
    },
    {
      name: 'Druid Circle',
      description: 'You choose to identify with a circle of druids.'
    }
  ],
  3: [],
  4: [ASI,
    {
      name: 'Wild Shape (CR 1/2)',
      description: 'You can transform into beasts of CR 1/2 or lower that lack a flying speed.'
    }
  ],
  5: [],
  6: [
    {
      name: 'Druid Circle feature',
      description: 'Your druid circle grants you an additional feature.'
    }
  ],
  7: [],
  8: [ASI,
    {
      name: 'Wild Shape (CR 1)',
      description: 'You can transform into beasts of CR 1 or lower that lack a flying speed.'
    }
  ],
  9: [],
 10: [
    {
      name: 'Druid Circle feature',
      description: 'Your druid circle grants you an additional feature.'
    }
  ],
 11: [],
 12: [ASI],
 13: [],
 14: [
    {
      name: 'Druid Circle feature',
      description: 'Your druid circle grants you an additional feature.'
    },
    {
      name: 'Wild Shape (CR 2)',
      description: 'You can transform into beasts of CR 2 or lower.'
    }
  ],
 15: [],
 16: [ASI],
 17: [],
 18: [
    {
      name: 'Timeless Body',
      description:
        'The rigors of time no longer affect you as they once did.'
    },
    {
      name: 'Beast Spells',
      description: 'You can cast many druid spells while in Wild Shape.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Archdruid',
      description:
        'You can use Wild Shape an unlimited number of times and ignore the verbal and somatic components of your druid spells.'
    }
  ]
};

const fighterFeatures = {
  1: [
    {
      name: 'Fighting Style',
      description: 'You adopt a particular style of fighting as your specialty.'
    },
    {
      name: 'Second Wind',
      description: 'You have a limited well of stamina you can draw on to protect yourself.'
    }
  ],
  2: [
    {
      name: 'Action Surge (one use)',
      description: 'You can push yourself beyond normal limits for a moment.'
    }
  ],
  3: [
    {
      name: 'Martial Archetype',
      description: 'You choose an archetype that you strive to emulate in your combat styles.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Extra Attack',
      description:
        'You can attack twice whenever you take the Attack action on your turn.'
    }
  ],
  6: [ASI],
  7: [
    {
      name: 'Martial Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
  8: [ASI],
  9: [
    {
      name: 'Indomitable (one use)',
      description: 'You can reroll a saving throw that you fail.'
    }
  ],
 10: [
    {
      name: 'Martial Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 11: [
    {
      name: 'Extra Attack (2)',
      description:
        'You can attack three times whenever you take the Attack action on your turn.'
    }
  ],
 12: [ASI],
 13: [
    {
      name: 'Indomitable (two uses)',
      description:
        'You can reroll a saving throw that you fail. You can use this feature twice between long rests.'
    }
  ],
 14: [ASI],
 15: [
    {
      name: 'Martial Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Action Surge (two uses)',
      description: 'You can use Action Surge twice between rests.'
    },
    {
      name: 'Indomitable (three uses)',
      description: 'You can use Indomitable three times between long rests.'
    }
  ],
 18: [
    {
      name: 'Martial Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Extra Attack (3)',
      description:
        'You can attack four times whenever you take the Attack action on your turn.'
    }
  ]
};

const monkFeatures = {
  1: [
    {
      name: 'Unarmored Defense',
      description:
        'While not wearing armor or wielding a shield, your AC equals 10 + your Dex modifier + your Wis modifier.'
    },
    {
      name: 'Martial Arts',
      description:
        'Your practice of martial arts gives you mastery of combat styles using unarmed strikes and monk weapons.'
    }
  ],
  2: [
    {
      name: 'Ki',
      description: 'You can channel ki to fuel special abilities.'
    },
    {
      name: 'Unarmored Movement',
      description: 'Your speed increases while you are not wearing armor or wielding a shield.'
    }
  ],
  3: [
    {
      name: 'Monastic Tradition',
      description: 'You commit yourself to a monastic tradition.'
    },
    {
      name: 'Deflect Missiles',
      description:
        'You can use your reaction to deflect or catch a missile when you are hit by a ranged weapon attack.'
    }
  ],
  4: [ASI,
    {
      name: 'Slow Fall',
      description: 'You can use your reaction when you fall to reduce any falling damage you take.'
    }
  ],
  5: [
    {
      name: 'Extra Attack',
      description:
        'You can attack twice, instead of once, whenever you take the Attack action on your turn.'
    },
    {
      name: 'Stunning Strike',
      description:
        'You can interfere with the flow of ki in an opponent’s body.'
    }
  ],
  6: [
    {
      name: 'Ki-Empowered Strikes',
      description:
        'Your unarmed strikes count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks.'
    },
    {
      name: 'Monastic Tradition feature',
      description: 'Your tradition grants you an additional feature.'
    }
  ],
  7: [
    {
      name: 'Evasion',
      description: 'You can nimbly dodge out of the way of certain area effects.'
    },
    {
      name: 'Stillness of Mind',
      description:
        'You can use your action to end one effect on yourself that is causing you to be charmed or frightened.'
    }
  ],
  8: [ASI],
  9: [
    {
      name: 'Unarmored Movement Improvement',
      description:
        'You gain the ability to move along vertical surfaces and across liquids on your turn without falling during the move.'
    }
  ],
 10: [
    {
      name: 'Purity of Body',
      description: 'You are immune to disease and poison.'
    }
  ],
 11: [
    {
      name: 'Monastic Tradition feature',
      description: 'Your tradition grants you an additional feature.'
    }
  ],
 12: [ASI],
 13: [
    {
      name: 'Tongue of the Sun and Moon',
      description:
        'You understand all spoken languages and any creature that can understand a language can understand you.'
    }
  ],
 14: [
    {
      name: 'Diamond Soul',
      description: 'You gain proficiency in all saving throws.'
    }
  ],
 15: [
    {
      name: 'Timeless Body',
      description:
        'Your ki sustains you so that you suffer none of the frailty of old age.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Monastic Tradition feature',
      description: 'Your tradition grants you an additional feature.'
    }
  ],
 18: [
    {
      name: 'Empty Body',
      description: 'You can use your ki to become invisible or cast the astral projection spell.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Perfect Self',
      description:
        'When you roll for initiative and have no ki points remaining, you regain 4 ki points.'
    }
  ]
};

const paladinFeatures = {
  1: [
    {
      name: 'Divine Sense',
      description:
        'You can open your awareness to detect strong evil and powerful good.'
    },
    {
      name: 'Lay on Hands',
      description:
        'You have a pool of healing power that replenishes when you take a long rest.'
    }
  ],
  2: [
    {
      name: 'Fighting Style',
      description: 'You adopt a particular style of fighting as your specialty.'
    },
    {
      name: 'Spellcasting',
      description: 'You can cast paladin spells.'
    },
    {
      name: 'Divine Smite',
      description:
        'When you hit a creature with a melee weapon attack, you can expend a spell slot to deal radiant damage to the target.'
    }
  ],
  3: [
    {
      name: 'Divine Health',
      description: 'The divine magic flowing through you makes you immune to disease.'
    },
    {
      name: 'Sacred Oath',
      description: 'You commit yourself to a sacred oath.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Extra Attack',
      description:
        'You can attack twice, instead of once, whenever you take the Attack action on your turn.'
    }
  ],
  6: [
    {
      name: 'Aura of Protection',
      description:
        'Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus equal to your Charisma modifier.'
    }
  ],
  7: [
    {
      name: 'Sacred Oath feature',
      description: 'Your sacred oath grants you an additional feature.'
    }
  ],
  8: [ASI],
  9: [],
 10: [
    {
      name: 'Aura of Courage',
      description:
        'You and friendly creatures within 10 feet of you can’t be frightened while you are conscious.'
    }
  ],
 11: [
    {
      name: 'Improved Divine Smite',
      description: 'Your melee weapon strikes carry divine power.'
    }
  ],
 12: [ASI],
 13: [],
 14: [
    {
      name: 'Cleansing Touch',
      description:
        'You can use your action to end one spell on yourself or on one willing creature that you touch.'
    }
  ],
 15: [
    {
      name: 'Sacred Oath feature',
      description: 'Your sacred oath grants you an additional feature.'
    }
  ],
 16: [ASI],
 17: [],
 18: [
    {
      name: 'Aura Improvements',
      description:
        'The range of your Aura of Protection and Aura of Courage increases to 30 feet.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Sacred Oath feature',
      description: 'Your sacred oath grants you a final feature.'
    }
  ]
};

const rangerFeatures = {
  1: [
    {
      name: 'Favored Enemy',
      description:
        'You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy.'
    },
    {
      name: 'Natural Explorer',
      description:
        'You are particularly familiar with one type of natural environment and are adept at traveling and surviving in such regions.'
    }
  ],
  2: [
    {
      name: 'Fighting Style',
      description: 'You adopt a particular style of fighting as your specialty.'
    },
    {
      name: 'Spellcasting',
      description: 'You have learned to use the magical essence of nature to cast spells.'
    }
  ],
  3: [
    {
      name: 'Ranger Archetype',
      description: 'You choose an archetype that you strive to emulate.'
    },
    {
      name: 'Primeval Awareness',
      description:
        'You can use your action and expend a spell slot to focus your awareness on the region around you.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Extra Attack',
      description:
        'You can attack twice, instead of once, whenever you take the Attack action on your turn.'
    }
  ],
  6: [
    {
      name: 'Favored Enemy improvement',
      description: 'You choose an additional favored enemy.'
    },
    {
      name: 'Natural Explorer improvement',
      description: 'You choose an additional favored terrain.'
    }
  ],
  7: [
    {
      name: 'Ranger Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
  8: [ASI,
    {
      name: "Land's Stride",
      description: 'Moving through nonmagical difficult terrain costs you no extra movement.'
    }
  ],
  9: [
    {
      name: 'Natural Explorer improvement',
      description: 'You choose an additional favored terrain.'
    },
    {
      name: 'Hide in Plain Sight',
      description:
        'You can remain perfectly still for long periods of time to set up ambushes.'
    }
  ],
 10: [
    {
      name: 'Ranger Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 11: [
    {
      name: 'Favored Enemy improvement',
      description: 'You choose an additional favored enemy.'
    },
    {
      name: 'Natural Explorer improvement',
      description: 'You choose an additional favored terrain.'
    }
  ],
 12: [ASI],
 13: [
    {
      name: 'Ranger Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 14: [
    {
      name: 'Favored Enemy improvement',
      description: 'You choose an additional favored enemy.'
    },
    {
      name: 'Natural Explorer improvement',
      description: 'You choose an additional favored terrain.'
    }
  ],
 15: [
    {
      name: 'Ranger Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Favored Enemy improvement',
      description: 'You choose an additional favored enemy.'
    },
    {
      name: 'Natural Explorer improvement',
      description: 'You choose an additional favored terrain.'
    }
  ],
 18: [
    {
      name: 'Feral Senses',
      description: 'You gain preternatural senses that help you fight creatures you can’t see.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Foe Slayer',
      description: 'You become an unparalleled hunter of your enemies.'
    }
  ]
};

const rogueFeatures = {
  1: [
    {
      name: 'Expertise',
      description:
        'Choose two of your skill proficiencies to double your proficiency bonus.'
    },
    {
      name: 'Sneak Attack',
      description: 'You know how to strike subtly and exploit a foe’s distraction.'
    },
    {
      name: "Thieves' Cant",
      description:
        "You have learned Thieves' Cant, a secret mix of dialect, jargon, and code."
    }
  ],
  2: [
    {
      name: 'Cunning Action',
      description:
        'You can take a bonus action on each of your turns to Dash, Disengage, or Hide.'
    }
  ],
  3: [
    {
      name: 'Roguish Archetype',
      description: 'You choose an archetype that you emulate in your roguish pursuits.'
    }
  ],
  4: [ASI],
  5: [
    {
      name: 'Uncanny Dodge',
      description:
        'When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack’s damage against you.'
    }
  ],
  6: [
    {
      name: 'Expertise',
      description: 'Choose two more skill proficiencies to gain Expertise.'
    }
  ],
  7: [
    {
      name: 'Evasion',
      description: 'You can nimbly dodge out of the way of certain area effects.'
    }
  ],
  8: [ASI],
  9: [
    {
      name: 'Roguish Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 10: [ASI],
 11: [
    {
      name: 'Reliable Talent',
      description:
        'Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.'
    }
  ],
 12: [ASI],
 13: [
    {
      name: 'Roguish Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 14: [
    {
      name: 'Blindsense',
      description:
        'If you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.'
    }
  ],
 15: [
    {
      name: 'Slippery Mind',
      description: 'You gain proficiency in Wisdom saving throws.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Roguish Archetype feature',
      description: 'Your archetype grants you an additional feature.'
    }
  ],
 18: [
    {
      name: 'Elusive',
      description:
        'No attack roll has advantage against you while you aren’t incapacitated.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Stroke of Luck',
      description:
        'If your attack misses a target within range, you can turn the miss into a hit.'
    }
  ]
};

const sorcererFeatures = {
  1: [
    {
      name: 'Spellcasting',
      description:
        'An event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic.'
    },
    {
      name: 'Sorcerous Origin',
      description:
        'You choose a sorcerous origin, which describes the source of your innate magical power.'
    }
  ],
  2: [
    {
      name: 'Font of Magic',
      description: 'You tap into a deep wellspring of magic within yourself.'
    }
  ],
  3: [
    {
      name: 'Metamagic',
      description: 'You gain the ability to twist your spells to suit your needs.'
    }
  ],
  4: [ASI],
  5: [],
  6: [
    {
      name: 'Sorcerous Origin feature',
      description: 'Your sorcerous origin grants you an additional feature.'
    }
  ],
  7: [],
  8: [ASI],
  9: [],
 10: [
    {
      name: 'Metamagic',
      description: 'You gain another Metamagic option.'
    }
  ],
 11: [],
 12: [ASI],
 13: [],
 14: [
    {
      name: 'Sorcerous Origin feature',
      description: 'Your sorcerous origin grants you an additional feature.'
    }
  ],
 15: [],
 16: [ASI],
 17: [
    {
      name: 'Metamagic',
      description: 'You gain another Metamagic option.'
    }
  ],
 18: [
    {
      name: 'Sorcerous Origin feature',
      description: 'Your sorcerous origin grants you an additional feature.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Sorcerous Restoration',
      description: 'You regain 4 expended sorcery points whenever you finish a short rest.'
    }
  ]
};

const warlockFeatures = {
  1: [
    {
      name: 'Otherworldly Patron',
      description:
        'You have struck a bargain with an otherworldly being of your choice.'
    },
    {
      name: 'Pact Magic',
      description:
        'Your arcane research and the magic bestowed on you by your patron have given you facility with spells.'
    }
  ],
  2: [
    {
      name: 'Eldritch Invocations',
      description:
        'You gain the ability to cast certain spells or gain other magical effects at will.'
    }
  ],
  3: [
    {
      name: 'Pact Boon',
      description: 'Your otherworldly patron bestows a boon for your loyal service.'
    }
  ],
  4: [ASI],
  5: [],
  6: [
    {
      name: 'Otherworldly Patron feature',
      description: 'Your patron grants you an additional feature.'
    }
  ],
  7: [],
  8: [ASI],
  9: [],
 10: [
    {
      name: 'Otherworldly Patron feature',
      description: 'Your patron grants you an additional feature.'
    }
  ],
 11: [
    {
      name: 'Mystic Arcanum (6th level)',
      description:
        'Your patron bestows upon you a magical secret called an arcanum.'
    }
  ],
 12: [ASI],
 13: [
    {
      name: 'Mystic Arcanum (7th level)',
      description: 'You gain a 7th-level arcanum.'
    }
  ],
 14: [
    {
      name: 'Otherworldly Patron feature',
      description: 'Your patron grants you an additional feature.'
    }
  ],
 15: [
    {
      name: 'Mystic Arcanum (8th level)',
      description: 'You gain an 8th-level arcanum.'
    }
  ],
 16: [ASI],
 17: [
    {
      name: 'Mystic Arcanum (9th level)',
      description: 'You gain a 9th-level arcanum.'
    }
  ],
 18: [
    {
      name: 'Otherworldly Patron feature',
      description: 'Your patron grants you an additional feature.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Eldritch Master',
      description:
        'You can draw on your inner reserve of mystical power while entreating your patron to regain expended spell slots.'
    }
  ]
};

const wizardFeatures = {
  1: [
    {
      name: 'Spellcasting',
      description: 'You have learned to cast spells through rigorous study.'
    },
    {
      name: 'Arcane Recovery',
      description:
        'You have learned to regain some of your magical energy by studying your spellbook.'
    }
  ],
  2: [
    {
      name: 'Arcane Tradition',
      description: 'You choose an arcane tradition, shaping your practice of magic.'
    }
  ],
  3: [],
  4: [ASI],
  5: [],
  6: [
    {
      name: 'Arcane Tradition feature',
      description: 'Your arcane tradition grants you an additional feature.'
    }
  ],
  7: [],
  8: [ASI],
  9: [],
 10: [
    {
      name: 'Arcane Tradition feature',
      description: 'Your arcane tradition grants you an additional feature.'
    }
  ],
 11: [],
 12: [ASI],
 13: [],
 14: [
    {
      name: 'Arcane Tradition feature',
      description: 'Your arcane tradition grants you an additional feature.'
    }
  ],
 15: [],
 16: [ASI],
 17: [],
 18: [
    {
      name: 'Spell Mastery',
      description:
        'You have achieved such mastery over certain spells that you can cast them at will.'
    }
  ],
 19: [ASI],
 20: [
    {
      name: 'Signature Spells',
      description:
        'You gain mastery over two powerful spells and can cast them with little effort.'
    }
  ]
};

const classFeatures = {
  barbarian: { featuresByLevel: barbarianFeatures },
  bard: {
    featuresByLevel: bardFeatures,
    spellSlots: fullCasterSlots,
    spellsKnown: bardSpellsKnown
  },
  cleric: {
    featuresByLevel: clericFeatures,
    spellSlots: fullCasterSlots
  },
  druid: {
    featuresByLevel: druidFeatures,
    spellSlots: fullCasterSlots
  },
  fighter: { featuresByLevel: fighterFeatures },
  monk: { featuresByLevel: monkFeatures },
  paladin: {
    featuresByLevel: paladinFeatures,
    spellSlots: halfCasterSlots,
    spellsKnown: paladinSpellsKnown
  },
  ranger: {
    featuresByLevel: rangerFeatures,
    spellSlots: halfCasterSlots,
    spellsKnown: rangerSpellsKnown
  },
  rogue: { featuresByLevel: rogueFeatures },
  sorcerer: {
    featuresByLevel: sorcererFeatures,
    spellSlots: fullCasterSlots,
    spellsKnown: sorcererSpellsKnown
  },
  warlock: {
    featuresByLevel: warlockFeatures,
    pactMagic,
    spellsKnown: warlockSpellsKnown
  },
  wizard: {
    featuresByLevel: wizardFeatures,
    spellSlots: fullCasterSlots,
    spellsKnown: wizardSpellsKnown
  }
};

module.exports = classFeatures;

