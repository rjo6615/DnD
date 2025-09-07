const backgrounds = {
  acolyte: {
    name: 'Acolyte',
    skills: {
      insight: { proficient: true },
      religion: { proficient: true },
    },
    toolProficiencies: [],
    description: 'You have spent your life in service to a temple, gaining the Shelter of the Faithful feature.',
  },
  criminal: {
    name: 'Criminal',
    skills: {
      deception: { proficient: true },
      stealth: { proficient: true },
    },
    toolProficiencies: ["thieves' tools", 'gaming set'],
    description: 'You have a reliable contact in the criminal underworld.',
  },
  folkHero: {
    name: 'Folk Hero',
    skills: {
      animalHandling: { proficient: true },
      survival: { proficient: true },
    },
    toolProficiencies: ['artisan tools', 'vehicles (land)'],
    description: 'People are inclined to trust you thanks to your rustic hospitality.',
  },
  sage: {
    name: 'Sage',
    skills: {
      arcana: { proficient: true },
      history: { proficient: true },
    },
    toolProficiencies: [],
    description: 'If you do not know a piece of lore, you know where to find it.',
  },
  soldier: {
    name: 'Soldier',
    skills: {
      athletics: { proficient: true },
      intimidation: { proficient: true },
    },
    toolProficiencies: ['gaming set', 'vehicles (land)'],
    description: 'Your military rank allows you to exert influence in armies.',
  },
};

module.exports = backgrounds;
