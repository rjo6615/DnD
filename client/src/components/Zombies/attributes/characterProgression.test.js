import { getCharacterTotalLevel, getMulticlassSummary, getAvailableLevelUpClasses, getAvailableNewClasses, validateAddClassSelection, validateLevelUpSelection } from './characterProgression';

const character = {
  occupation: [
    { Occupation: 'Fighter', Level: 2, Health: 10 },
    { Occupation: 'Sorcerer', Level: 20, Health: 6 },
    { Occupation: 'Warlock', Level: 5, Health: 8 },
  ],
};

const classRecords = [
  { name: 'Fighter', hitDie: 'd10', primaryAbility: 'Strength' },
  { name: 'Barbarian', hitDie: 'd12', primaryAbility: 'Strength' },
];

test('calculates total level and sorted multiclass summary', () => {
  expect(getCharacterTotalLevel(character)).toBe(27);
  expect(getMulticlassSummary(character)).toBe('Sorcerer 20 / Warlock 5 / Fighter 2');
});

test('marks max-level existing classes disabled while allowing valid selections', () => {
  const options = getAvailableLevelUpClasses(character);
  expect(options.find((entry) => entry.name === 'Sorcerer')).toMatchObject({ disabled: true, reason: 'Maximum class level reached' });
  expect(validateLevelUpSelection(character, 'Fighter')).toEqual({ valid: true, message: '' });
  expect(validateLevelUpSelection(character, 'Sorcerer').valid).toBe(false);
});

test('prevents duplicate new classes and validates add-class selections', () => {
  const options = getAvailableNewClasses(character, classRecords);
  expect(options.find((entry) => entry.name === 'Fighter')).toMatchObject({ disabled: true, currentLevel: 2 });
  expect(validateAddClassSelection(character, classRecords, 'Barbarian')).toEqual({ valid: true, message: '' });
  expect(validateAddClassSelection(character, classRecords, 'Fighter').valid).toBe(false);
});
