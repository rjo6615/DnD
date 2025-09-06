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
  charlatan: {
    name: 'Charlatan',
    skills: {
      deception: { proficient: true },
      sleightOfHand: { proficient: true },
    },
    toolProficiencies: ['disguise kit', 'forgery kit'],
    description: 'You create false identities and forge documents with ease.',
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
  entertainer: {
    name: 'Entertainer',
    skills: {
      acrobatics: { proficient: true },
      performance: { proficient: true },
    },
    toolProficiencies: ['disguise kit', 'musical instrument'],
    description: 'Your performances earn you lodging and admiration by popular demand.',
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
  guildArtisan: {
    name: 'Guild Artisan',
    skills: {
      insight: { proficient: true },
      persuasion: { proficient: true },
    },
    toolProficiencies: ['artisan tools'],
    description: 'As a member of a guild you can leverage guild membership for support.',
  },
  hermit: {
    name: 'Hermit',
    skills: {
      medicine: { proficient: true },
      religion: { proficient: true },
    },
    toolProficiencies: ['herbalism kit'],
    description: 'Years of solitude have led to a unique discovery.',
  },
  noble: {
    name: 'Noble',
    skills: {
      history: { proficient: true },
      persuasion: { proficient: true },
    },
    toolProficiencies: ['gaming set'],
    description: 'You enjoy a position of privilege among other nobles.',
  },
  outlander: {
    name: 'Outlander',
    skills: {
      athletics: { proficient: true },
      survival: { proficient: true },
    },
    toolProficiencies: ['musical instrument'],
    description: 'You can find safe paths through the wilderness and recall geographical details.',
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
  sailor: {
    name: 'Sailor',
    skills: {
      athletics: { proficient: true },
      perception: { proficient: true },
    },
    toolProficiencies: ["navigator's tools", 'vehicles (water)'],
    description: "You can secure free passage on sailing ships using the Ship's Passage feature.",
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
  urchin: {
    name: 'Urchin',
    skills: {
      sleightOfHand: { proficient: true },
      stealth: { proficient: true },
    },
    toolProficiencies: ['disguise kit', "thieves' tools"],
    description: 'You know the secret patterns of city streets and can move through them quickly.',
  },
};

module.exports = backgrounds;
