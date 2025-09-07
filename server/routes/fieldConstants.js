const numericFields = [
  'age',
  'height',
  'weight',
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
  'startStatTotal',
  'health',
  'tempHealth',
  'initiative',
  'ac',
  'speed',
  'hpMaxBonus',
  'hpMaxBonusPerLevel',
];

// Define the list of available skills
const skillNames = [
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
];

// Map each skill to a proficiency/expertise structure
const skillFields = skillNames.reduce((acc, skill) => {
  acc[skill] = { proficient: false, expertise: false };
  return acc;
}, {});

module.exports = {
  numericFields,
  skillFields,
  skillNames,
};
