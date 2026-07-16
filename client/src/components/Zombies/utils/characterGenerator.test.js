import { assignAbilityScores, chooseClassBuildProfile, chooseFigurine, classBuildProfiles, figurineMetadata, generateSmartCharacter, normalizeAICharacter, scoreFigurine, validateGeneratedCharacter } from './characterGenerator';

const classes = {
  barbarian: { name: 'Barbarian', hitDie: 12, proficiencies: { skills: { count: 0, options: [] } } },
  wizard: { name: 'Wizard', hitDie: 6, proficiencies: { skills: { count: 0, options: [] } } },
  monk: { name: 'Monk', hitDie: 8, proficiencies: { skills: { count: 0, options: [] } } },
  paladin: { name: 'Paladin', hitDie: 10, proficiencies: { skills: { count: 0, options: [] } } },
  fighter: { name: 'Fighter', hitDie: 10, proficiencies: { skills: { count: 0, options: [] } } },
};
const races = { human: { name: 'Human', size: 'Medium' }, dwarf: { name: 'Dwarf', size: 'Medium' } };
const backgrounds = { soldier: { name: 'Soldier' }, sage: { name: 'Sage' } };
const baseForm = { campaign: 'camp', token: 'player' };
const pool = [15, 14, 13, 12, 10, 8];

test('barbarian prioritizes Strength and Constitution', () => {
  const scores = assignAbilityScores(pool, classBuildProfiles.barbarian);
  expect(scores.str).toBe(15);
  expect(scores.con).toBeGreaterThanOrEqual(13);
});

test('wizard prioritizes Intelligence', () => {
  const scores = assignAbilityScores(pool, classBuildProfiles.wizard);
  expect(scores.int).toBe(15);
});

test('monk prioritizes Dexterity and Wisdom', () => {
  const scores = assignAbilityScores(pool, classBuildProfiles.monk);
  expect([scores.dex, scores.wis].sort((a, b) => b - a)).toEqual([15, 14]);
});

test('paladin prioritizes Strength and Charisma', () => {
  const scores = assignAbilityScores(pool, classBuildProfiles.paladin);
  expect([scores.str, scores.cha].sort((a, b) => b - a)).toEqual([15, 14]);
});

test('class variants produce valid score assignments', () => {
  const profile = chooseClassBuildProfile('fighter', () => 0.9);
  const scores = assignAbilityScores(pool, profile);
  expect(Math.max(...Object.values(scores))).toBe(scores.dex);
  Object.values(scores).forEach((value) => expect(value).toBeGreaterThanOrEqual(1));
});

test('generated character passes validation and conditional ancestry is absent unless relevant', () => {
  const character = generateSmartCharacter({ baseForm, races, classes: { barbarian: classes.barbarian }, backgrounds, random: () => 0 });
  expect(validateGeneratedCharacter(character).valid).toBe(true);
  expect(character.dragonAncestryKey || '').toBe('');
});

test('figurine scoring favors matching race/class tags and fallback is neutral', () => {
  const barbarian = { race: { name: 'Human' }, classKey: 'barbarian', appearanceTags: ['barbarian', 'axe'] };
  expect(scoreFigurine(figurineMetadata[3], barbarian)).toBeGreaterThan(scoreFigurine(figurineMetadata[1], barbarian));
  expect(chooseFigurine({ classKey: 'unknown', appearanceTags: [] }, [{ id: 'neutral', name: 'Neutral', publicId: 'Tokens/Neutral', tags: ['neutral'] }]).figurineImagePublicId).toBe('Tokens/Neutral');
});

test('repeated generation produces variety', () => {
  const first = generateSmartCharacter({ baseForm, races, classes, backgrounds, random: () => 0 });
  const second = generateSmartCharacter({ baseForm, races, classes, backgrounds, random: () => 0.99 });
  expect(`${first.characterName}-${first.occupation[0].Occupation}`).not.toEqual(`${second.characterName}-${second.occupation[0].Occupation}`);
});

test('AI normalization repairs unsupported data, clamps through local rules, and selects figurine locally', () => {
  const result = normalizeAICharacter({ aiData: { name: 'VeryLongCharacterName', class: 'Unsupported', race: 'Dwarf', background: 'Sage', abilityScores: { str: 99 }, shortConcept: 'A repaired hero.' }, baseForm, races, classes, backgrounds, random: () => 0 });
  expect(result.characterName.length).toBeLessThanOrEqual(12);
  Object.values({ str: result.str, dex: result.dex, con: result.con, int: result.int, wis: result.wis, cha: result.cha }).forEach((value) => expect(value).toBeGreaterThanOrEqual(1));
  expect(result.figurineImagePublicId).toBeTruthy();
});

test('malformed AI response does not create a character', () => {
  expect(() => normalizeAICharacter({ aiData: null, baseForm, races, classes, backgrounds })).toThrow('Malformed AI response.');
});
