const { isSpell } = require('../validation/spell');
/** @typedef {import('../../types/spell').Spell} Spell */

/** @type {Record<string, Spell>} */
const spells = {
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
      'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person.',
    classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
  },
};

Object.values(spells).forEach(spell => {
  if (!isSpell(spell)) {
    throw new Error(`Invalid spell data: ${spell && spell.name}`);
  }
});

module.exports = spells;
