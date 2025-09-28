export const WEAPON_MASTERY_OPTIONS = [
  {
    id: 'cleave',
    title: 'Cleave',
    description:
      'When you hit a creature with this weapon, you can make another attack against a second creature within 5 feet of the original target and within your reach.'
  },
  {
    id: 'flex',
    title: 'Flex',
    description:
      'If this weapon has the Versatile property, you deal its Versatile damage even when wielding it with one hand.'
  },
  {
    id: 'graze',
    title: 'Graze',
    description:
      'If your attack roll misses, the target still takes damage equal to your Strength or Dexterity modifier.'
  },
  {
    id: 'nick',
    title: 'Nick',
    description:
      'You can make a bonus action attack with this weapon, but only once per turn.'
  },
  {
    id: 'push',
    title: 'Push',
    description:
      'On a hit, you can push the target up to 10 feet away from you if it is no more than one size larger than you.'
  },
  {
    id: 'sap',
    title: 'Sap',
    description:
      'When you hit, the target has disadvantage on its next attack roll before the start of your next turn.'
  },
  {
    id: 'slow',
    title: 'Slow',
    description:
      'A creature you hit has its speed reduced by 10 feet until the start of your next turn.'
  },
  {
    id: 'topple',
    title: 'Topple',
    description:
      'If the target is no more than one size larger than you, it must succeed on a Strength saving throw or fall prone.'
  },
  {
    id: 'vex',
    title: 'Vex',
    description:
      'If you hit a creature with this weapon, you have advantage on the next attack you make against that creature before the end of your next turn.'
  }
];

export const WEAPON_MASTERY_OPTION_MAP = WEAPON_MASTERY_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option;
    return acc;
  },
  {}
);
