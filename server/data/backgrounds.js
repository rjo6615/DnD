const backgrounds = {
  acolyte: {
    name: 'Acolyte',
    skills: {
      insight: { proficient: true },
      religion: { proficient: true },
    },
    toolProficiencies: [],
  },
  criminal: {
    name: 'Criminal',
    skills: {
      deception: { proficient: true },
      stealth: { proficient: true },
    },
    toolProficiencies: ["thieves' tools", 'gaming set'],
  },
  folkHero: {
    name: 'Folk Hero',
    skills: {
      animalHandling: { proficient: true },
      survival: { proficient: true },
    },
    toolProficiencies: ['artisan tools', 'vehicles (land)'],
  },
  noble: {
    name: 'Noble',
    skills: {
      history: { proficient: true },
      persuasion: { proficient: true },
    },
    toolProficiencies: ['gaming set'],
  },
  sage: {
    name: 'Sage',
    skills: {
      arcana: { proficient: true },
      history: { proficient: true },
    },
    toolProficiencies: [],
  },
  soldier: {
    name: 'Soldier',
    skills: {
      athletics: { proficient: true },
      intimidation: { proficient: true },
    },
    toolProficiencies: ['gaming set', 'vehicles (land)'],
  },
};

module.exports = backgrounds;
