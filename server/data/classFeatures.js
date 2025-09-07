// Mapping of class names to their features and spell progression.
// Each class maps to an object with `featuresByLevel` and optional
// `spellSlots` and `spellsKnown` mappings keyed by level.

/**
 * @typedef {{ name: string, description: string }} Feature
 * @typedef {{ featuresByLevel: Record<number, Feature[]>, spellSlots?: Record<number, Record<number, number>>, spellsKnown?: Record<number, number> }} ClassFeatures
 * @type {Record<string, ClassFeatures>}
 */
const classFeatures = {
  fighter: {
    featuresByLevel: {
      1: [
        {
          name: 'Fighting Style',
          description: 'You adopt a particular style of fighting as your specialty.'
        },
        {
          name: 'Second Wind',
          description: 'You have a limited well of stamina that you can draw on to protect yourself.'
        }
      ],
      2: [
        {
          name: 'Action Surge',
          description: 'You can push yourself beyond your normal limits for a moment.'
        }
      ],
      3: [
        {
          name: 'Martial Archetype',
          description: 'You choose an archetype that you strive to emulate in your combat styles and techniques.'
        }
      ]
    }
  },
  wizard: {
    featuresByLevel: {
      1: [
        { name: 'Spellcasting', description: 'You have learned to cast spells through rigorous study.' },
        { name: 'Arcane Recovery', description: 'You have learned to regain some of your magical energy by studying your spellbook.' }
      ],
      2: [
        { name: 'Arcane Tradition', description: 'You choose an arcane tradition, shaping your practice of magic.' }
      ]
    },
    spellSlots: {
      1: { 1: 2 }, // level 1: two 1st-level spell slots
      2: { 1: 3 }
    },
    spellsKnown: {
      1: 6,
      2: 7
    }
  }
};

module.exports = classFeatures;
