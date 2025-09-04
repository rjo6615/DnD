const { isSpell } = require('../validation/spell');
/** @typedef {import('../../types/spell').Spell} Spell */

/** @type {Record<string, Spell>} */
const spells = {
  'acid-arrow': {
    name: 'Acid Arrow',
    level: 2,
    school: 'Evocation',
    castingTime: '1 action',
    range: '90 feet',
    components: ['V', 'S', "M (powdered rhubarb leaf and an adder's stomach)"],
    duration: 'Instantaneous',
    description:
      "A shimmering green arrow streaks toward a target within range and bursts in a spray of acid. The target takes 4d4 acid damage immediately and 2d4 acid damage at the end of its next turn.",
    classes: ['Wizard'],
  },
  bless: {
    name: 'Bless',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    components: ['V', 'S', 'M (a sprinkling of holy water)'],
    duration: 'Up to 1 minute',
    description:
      "You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.",
    classes: ['Cleric'],
  },
  'cure-wounds': {
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description:
      'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. The spell has no effect on undead or constructs.',
    classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'],
  },
  fireball: {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: ['V', 'S', 'M (a tiny ball of bat guano and sulfur)'],
    duration: 'Instantaneous',
    description:
      'A bright streak flashes from your pointing finger to a point you choose and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much on a successful one.',
    classes: ['Sorcerer', 'Wizard'],
  },
  'mage-hand': {
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '30 feet',
    components: ['V', 'S'],
    duration: '1 minute',
    description:
      'A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand can manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial.',
    classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
  },
  'magic-missile': {
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description:
      'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.',
    classes: ['Sorcerer', 'Wizard'],
  },
  shield: {
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    components: ['V', 'S'],
    duration: '1 round',
    description:
      'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.',
    classes: ['Sorcerer', 'Wizard'],
  },
  invisibility: {
    name: 'Invisibility',
    level: 2,
    school: 'Illusion',
    castingTime: '1 action',
    range: 'Touch',
    components: ['V', 'S', 'M (an eyelash encased in gum arabic)'],
    duration: 'Up to 1 hour',
    description:
      "A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target's person.",
    classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
  },
  wish: {
    name: 'Wish',
    level: 9,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Self',
    components: ['V'],
    duration: 'Instantaneous',
    description:
      'Wish is the mightiest spell a mortal creature can cast. You duplicate any other spell of 8th level or lower or create an effect beyond the scope of the other spells listed here.',
    classes: ['Sorcerer', 'Wizard'],
  },
  identify: {
    name: 'Identify',
    level: 1,
    school: 'Divination',
    castingTime: '1 minute',
    range: 'Touch',
    components: ['V', 'S', 'M (a pearl worth at least 100 gp and an owl feather)'],
    duration: 'Instantaneous',
    description:
      'You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them.',
    classes: ['Bard', 'Wizard'],
  },
};

Object.values(spells).forEach(spell => {
  if (!isSpell(spell)) {
    throw new Error(`Invalid spell data: ${spell && spell.name}`);
  }
});

module.exports = spells;
