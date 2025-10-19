const weaponMasteries = {
  cleave: {
    label: 'Cleave',
    description:
      "If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the original target and within your reach. On a hit, the second creature takes the weapon's damage, but don't add your ability modifier to the damage roll. You can make this extra attack only once per turn.",
  },
  graze: {
    label: 'Graze',
    description:
      'If your attack roll with this weapon misses a creature, you can still deal damage to that creature equal to the ability modifier you used to make the attack roll. You can deal this extra damage only once per turn.',
  },
  nick: {
    label: 'Nick',
    description:
      'When you make the extra attack of the Light property with this weapon, you can make it as part of the Attack action instead of as a Bonus Action. You can still make this extra attack only once per turn.',
  },
  push: {
    label: 'Push',
    description:
      'If you hit a creature with this weapon, you can push the creature up to 10 feet away from you if it fails a Strength saving throw (DC equals 8 + your proficiency bonus + the ability modifier you used for the attack roll). You can use this property only once per turn.',
  },
  sap: {
    label: 'Sap',
    description:
      'If you hit a creature with this weapon and deal damage to it, the creature has disadvantage on the next attack roll it makes before the start of your next turn.',
  },
  slow: {
    label: 'Slow',
    description:
      'If you hit a creature with this weapon, the creature’s Speed is reduced by 10 feet until the start of your next turn.',
  },
  topple: {
    label: 'Topple',
    description:
      'If you hit a creature with this weapon, you can force the creature to make a Strength saving throw (DC equals 8 + your proficiency bonus + the ability modifier you used for the attack roll). On a failed save, the creature has the Prone condition. You can use this property only once per turn.',
  },
  vex: {
    label: 'Vex',
    description:
      'If you hit a creature with this weapon and deal damage to the creature, you have Advantage on the next attack roll you make against that creature before the end of your next turn.',
  },
};

export default weaponMasteries;
