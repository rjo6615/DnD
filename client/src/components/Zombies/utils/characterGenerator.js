import { STATS } from '../statSchema';

export const STAT_KEYS = STATS.map((stat) => stat.key);
export const STAT_LABELS = Object.fromEntries(STATS.map((stat) => [stat.key, stat.label]));

export const classBuildProfiles = {
  barbarian: { primary: ['str'], secondary: ['con', 'dex'], lowPriority: ['int', 'cha'], archetype: 'Primal bruiser', tags: ['barbarian', 'martial', 'axe'] },
  bard: { primary: ['cha'], secondary: ['dex', 'con'], lowPriority: ['str'], archetype: 'Silver-tongued performer', tags: ['bard', 'caster', 'lightly-armored'] },
  cleric: { variants: [
    { name: 'Devout battle-priest', primary: ['wis'], secondary: ['con', 'str'], lowPriority: ['dex'], tags: ['cleric', 'armored', 'shield'] },
    { name: 'Temple spellcaster', primary: ['wis'], secondary: ['con', 'cha'], lowPriority: ['str'], tags: ['cleric', 'caster', 'staff'] },
  ] },
  druid: { primary: ['wis'], secondary: ['con', 'dex'], lowPriority: ['str'], archetype: 'Wild mystic', tags: ['druid', 'caster', 'staff'] },
  fighter: { variants: [
    { name: 'Strength melee fighter', primary: ['str'], secondary: ['con', 'dex'], lowPriority: ['int'], tags: ['fighter', 'martial', 'armored', 'sword', 'shield'] },
    { name: 'Dexterity duelist', primary: ['dex'], secondary: ['con', 'str'], lowPriority: ['cha'], tags: ['fighter', 'martial', 'lightly-armored', 'sword'] },
    { name: 'Dexterity archer', primary: ['dex'], secondary: ['con', 'wis'], lowPriority: ['cha'], tags: ['fighter', 'martial', 'bow'] },
  ] },
  monk: { primary: ['dex', 'wis'], secondary: ['con'], lowPriority: ['str', 'cha'], archetype: 'Disciplined ascetic', tags: ['monk', 'martial', 'unarmored'] },
  paladin: { primary: ['str', 'cha'], secondary: ['con'], lowPriority: ['int'], archetype: 'Oathbound protector', tags: ['paladin', 'martial', 'armored', 'shield'] },
  ranger: { variants: [
    { name: 'Wilderness archer', primary: ['dex', 'wis'], secondary: ['con'], lowPriority: ['cha'], tags: ['ranger', 'martial', 'bow'] },
    { name: 'Two-weapon ranger', primary: ['dex', 'wis'], secondary: ['con', 'str'], lowPriority: ['cha'], tags: ['ranger', 'martial', 'lightly-armored', 'sword'] },
  ] },
  rogue: { variants: [
    { name: 'Stealth infiltrator', primary: ['dex'], secondary: ['con', 'wis'], lowPriority: ['str'], tags: ['rogue', 'lightly-armored', 'dagger'] },
    { name: 'Charming scoundrel', primary: ['dex'], secondary: ['cha', 'con'], lowPriority: ['str'], tags: ['rogue', 'lightly-armored', 'dagger'] },
  ] },
  sorcerer: { primary: ['cha'], secondary: ['con', 'dex'], lowPriority: ['str'], archetype: 'Innate spellcaster', tags: ['sorcerer', 'caster', 'robes', 'staff'] },
  warlock: { primary: ['cha'], secondary: ['con', 'dex'], lowPriority: ['str'], archetype: 'Pact-bound occultist', tags: ['warlock', 'caster', 'robes', 'wand'] },
  wizard: { primary: ['int'], secondary: ['con', 'dex'], lowPriority: ['str', 'cha'], archetype: 'Arcane scholar', tags: ['wizard', 'caster', 'robes', 'staff'] },
};

const fantasyNames = ['Aelar', 'Borin', 'Cora', 'Dain', 'Elora', 'Finn', 'Kael', 'Mira', 'Nix', 'Orin', 'Perrin', 'Rook', 'Tavi', 'Vexa', 'Wren'].map((name) => name.slice(0, 12));
const alignments = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral'];
const physicalBySize = { Tiny: { age: [18, 120], weight: [25, 70] }, Small: { age: [18, 180], weight: [35, 90] }, Medium: { age: [18, 220], weight: [90, 260] }, Large: { age: [18, 160], weight: [250, 520] } };

const randomInt = (min, max, random = Math.random) => Math.floor(random() * (max - min + 1)) + min;
const choice = (items, random = Math.random) => items[Math.floor(random() * items.length)];
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const getClassKey = (className, classes = {}) => Object.keys(classes).find((key) => normalize(key) === normalize(className) || normalize(classes[key]?.name) === normalize(className));
export const chooseClassBuildProfile = (classKey, random = Math.random) => {
  const config = classBuildProfiles[classKey];
  if (!config) return { name: 'Balanced adventurer', primary: ['con'], secondary: ['dex'], lowPriority: [], tags: ['adventurer'] };
  if (Array.isArray(config.variants)) return choice(config.variants, random);
  return { name: config.archetype || 'Balanced adventurer', ...config };
};

export const rollAbilityPool = (random = Math.random) => Array.from({ length: 6 }, () => {
  const rolls = Array.from({ length: 4 }, () => randomInt(1, 6, random)).sort((a, b) => a - b);
  return rolls.slice(1).reduce((total, roll) => total + roll, 0);
});

export const assignAbilityScores = (pool, profile) => {
  const scores = {};
  const orderedStats = [...new Set([...(profile.primary || []), ...(profile.secondary || []), ...STAT_KEYS.filter((key) => !(profile.lowPriority || []).includes(key)), ...(profile.lowPriority || [])])].filter((key) => STAT_KEYS.includes(key));
  const sorted = [...pool].sort((a, b) => b - a);
  orderedStats.forEach((key, index) => { scores[key] = Math.min(30, Math.max(1, sorted[index] ?? 10)); });
  STAT_KEYS.forEach((key) => { if (!scores[key]) scores[key] = 10; });
  return scores;
};

const normalizeOccupation = (klass, random = Math.random) => {
  const prof = klass?.proficiencies || {};
  const available = [...(prof.skills?.options || [])];
  const skills = {};
  for (let i = 0; i < (prof.skills?.count || 0); i += 1) {
    if (!available.length) break;
    const skill = available.splice(Math.floor(random() * available.length), 1)[0];
    skills[skill] = { proficient: true };
  }
  return { Occupation: klass.name, Health: klass.hitDie, Level: 1, proficiencyPoints: prof.skills?.count || 0, armor: prof.armor || [], weapons: prof.weapons || [], tools: prof.tools || [], savingThrows: prof.savingThrows || [], skills };
};

export const figurineMetadata = [
  { id: 'fighter-human', name: 'Armored Adventurer', publicId: 'Tokens/Adventurers/Core_Class_Tokens/Fighter', supportedClasses: ['fighter', 'paladin'], tags: ['human', 'martial', 'armored', 'sword', 'shield'] },
  { id: 'wizard-robe', name: 'Robed Spellcaster', publicId: 'Tokens/Adventurers/Core_Class_Tokens/Wizard', supportedClasses: ['wizard', 'sorcerer', 'warlock'], tags: ['caster', 'robes', 'staff', 'wand'] },
  { id: 'rogue-hood', name: 'Hooded Scout', publicId: 'Tokens/Adventurers/Core_Class_Tokens/Rogue', supportedClasses: ['rogue', 'ranger'], tags: ['rogue', 'lightly-armored', 'dagger', 'bow'] },
  { id: 'barbarian-axe', name: 'Axe Champion', publicId: 'Tokens/Adventurers/Core_Class_Tokens/Barbarian', supportedClasses: ['barbarian'], tags: ['barbarian', 'martial', 'axe'] },
  { id: 'neutral', name: 'Neutral Adventurer', publicId: 'Tokens/Adventurers/Core_Class_Tokens/Adventurer', supportedClasses: [], tags: ['adventurer', 'neutral'] },
];

export const scoreFigurine = (figurine, character) => {
  const race = normalize(character?.race?.name || character?.race);
  const klass = normalize(character?.classKey || character?.occupation?.[0]?.Occupation);
  const tags = new Set((character?.appearanceTags || []).map(normalize));
  let score = figurine.id === 'neutral' ? 1 : 0;
  if ((figurine.supportedClasses || []).some((item) => normalize(item) === klass)) score += 8;
  if ((figurine.supportedRaces || []).some((item) => normalize(item) === race)) score += 5;
  (figurine.tags || []).forEach((tag) => { if (tags.has(normalize(tag))) score += 2; if (normalize(tag) === race) score += 2; });
  return score;
};

export const chooseFigurine = (character, figurines = figurineMetadata, random = Math.random) => {
  const scored = figurines.map((figurine) => ({ figurine, score: scoreFigurine(figurine, character) })).sort((a, b) => b.score - a.score);
  const topScore = scored[0]?.score ?? 0;
  const top = scored.filter((entry) => entry.score === topScore && topScore > 0).map((entry) => entry.figurine);
  const selected = top.length ? choice(top, random) : figurines.find((item) => item.id === 'neutral');
  return { figurineImagePublicId: selected?.publicId || '', figurineName: selected?.name || 'Neutral adventurer', figurineScore: topScore };
};

export const validateGeneratedCharacter = (character) => {
  const errors = [];
  if (!character.characterName?.trim()) errors.push('Name is required.');
  if ((character.characterName || '').length > 12) errors.push('Name must be 12 characters or fewer.');
  if (!character.race) errors.push('Race is required.');
  if (!character.occupation?.length) errors.push('Class is required.');
  if (!character.background) errors.push('Background is required.');
  STAT_KEYS.forEach((key) => { const value = Number(character[key]); if (!Number.isFinite(value) || value < 1 || value > 30) errors.push(`${STAT_LABELS[key]} must be 1-30.`); });
  return { valid: errors.length === 0, errors };
};

export const generateSmartCharacter = ({ baseForm, races, classes, backgrounds, preferredName = '', random = Math.random }) => {
  const classKey = choice(Object.keys(classes || {}).filter((key) => classBuildProfiles[key]), random) || Object.keys(classes || {})[0];
  const raceKey = choice(Object.keys(races || {}), random);
  const backgroundKeys = Object.keys(backgrounds || {});
  const backgroundKey = choice(backgroundKeys, random);
  const race = races?.[raceKey] ? clone(races[raceKey]) : null;
  const klass = classes?.[classKey];
  const background = backgrounds?.[backgroundKey] ? clone(backgrounds[backgroundKey]) : null;
  const sizeOptions = race ? (Array.isArray(race.sizeOptions) && race.sizeOptions.length ? race.sizeOptions : race.size ? [race.size] : ['Medium']) : ['Medium'];
  const size = choice(sizeOptions, random);
  const profile = chooseClassBuildProfile(classKey, random);
  const scores = assignAbilityScores(rollAbilityPool(random), profile);
  const range = physicalBySize[size] || physicalBySize.Medium;
  const appearanceTags = [race?.name, classKey, ...(profile.tags || [])].filter(Boolean);
  const selectedFigurine = chooseFigurine({ race, classKey, appearanceTags }, figurineMetadata, random);
  const conMod = Math.floor((Number(scores.con) - 10) / 2);
  const character = { ...baseForm, characterName: (preferredName || choice(fantasyNames, random)).slice(0, 12), race, background, occupation: klass ? [normalizeOccupation(klass, random)] : [], alignment: choice(alignments, random), size, age: randomInt(range.age[0], range.age[1], random), sex: choice(['Female', 'Male', 'Nonbinary'], random), weight: randomInt(range.weight[0], range.weight[1], random), ...scores, startStatTotal: STAT_KEYS.reduce((sum, key) => sum + Number(scores[key] || 0), 0), health: klass?.hitDie || 8, tempHealth: Math.max(1, (klass?.hitDie || 8) + conMod), buildArchetype: profile.name, shortConcept: `${profile.name} shaped by the ${background?.name || 'adventurer'} background.`, appearanceTags, ...selectedFigurine };
  return { ...character, validation: validateGeneratedCharacter(character) };
};

export const normalizeAICharacter = ({ aiData, baseForm, races, classes, backgrounds, random = Math.random }) => {
  if (!aiData || typeof aiData !== 'object') throw new Error('Malformed AI response.');
  const classKey = getClassKey(aiData.class || aiData.classKey, classes) || Object.keys(classes || {})[0];
  const raceKey = Object.keys(races || {}).find((key) => normalize(key) === normalize(aiData.race) || normalize(races[key]?.name) === normalize(aiData.race)) || Object.keys(races || {})[0];
  const backgroundKey = Object.keys(backgrounds || {}).find((key) => normalize(key) === normalize(aiData.background) || normalize(backgrounds[key]?.name) === normalize(aiData.background)) || Object.keys(backgrounds || {})[0];
  if (!classKey || !raceKey || !backgroundKey) throw new Error('AI response did not include supported options.');
  const generated = generateSmartCharacter({ baseForm, races: { [raceKey]: races[raceKey] }, classes: { [classKey]: classes[classKey] }, backgrounds: { [backgroundKey]: backgrounds[backgroundKey] }, preferredName: aiData.name, random });
  const concept = typeof aiData.shortConcept === 'string' ? aiData.shortConcept.slice(0, 140) : generated.shortConcept;
  const tags = Array.isArray(aiData.appearanceTags) ? aiData.appearanceTags.slice(0, 8) : generated.appearanceTags;
  const figurine = chooseFigurine({ ...generated, classKey, appearanceTags: tags }, figurineMetadata, random);
  return { ...generated, shortConcept: concept, appearanceTags: tags, buildArchetype: aiData.buildArchetype || generated.buildArchetype, ...figurine, validation: validateGeneratedCharacter(generated), source: 'ai' };
};

export const createCharacterFromGeneratedData = (generated) => {
  const { validation, source, classKey, appearanceTags, figurineName, figurineScore, ...character } = generated || {};
  return character;
};
