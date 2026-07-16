export const CLASS_LEVEL_LIMIT = 20;

export function getCharacterTotalLevel(character = {}) {
  return (character.occupation || []).reduce((total, entry) => total + Number(entry.Level || 0), 0);
}

export function getClassName(entry = {}) {
  return entry.Occupation || entry.name || 'Unknown Class';
}

export function getClassLevel(entry = {}) {
  return Number(entry.Level || entry.level || 0);
}

export function getMulticlassSummary(character = {}) {
  const classes = character.occupation || [];
  if (!classes.length) return 'No class selected';
  return [...classes]
    .sort((a, b) => getClassLevel(b) - getClassLevel(a))
    .map((entry) => `${getClassName(entry)} ${getClassLevel(entry)}`)
    .join(' / ');
}

export function getAvailableLevelUpClasses(character = {}) {
  return (character.occupation || []).map((entry) => {
    const level = getClassLevel(entry);
    const isMaxLevel = level >= CLASS_LEVEL_LIMIT;
    return {
      id: getClassName(entry),
      name: getClassName(entry),
      level,
      nextLevel: level + 1,
      hitDie: entry.Health ? `d${entry.Health}` : null,
      subclass: entry.Subclass || entry.subclass || entry.subClass || null,
      disabled: isMaxLevel,
      reason: isMaxLevel ? 'Maximum class level reached' : '',
    };
  });
}

export function normalizeClassRecord(record = {}) {
  return {
    id: record._id || record.id || record.name,
    name: record.name || record.Occupation || 'Unknown Class',
    primaryAbility: record.primaryAbility || record.primary_ability || record.ability || null,
    hitDie: record.hitDie || record.hit_die || (record.Health ? `d${record.Health}` : null),
    description: record.description || record.role || record.summary || null,
  };
}

export function getAvailableNewClasses(character = {}, classRecords = []) {
  const existing = new Set((character.occupation || []).map((entry) => getClassName(entry)));
  return classRecords.map((record) => {
    const normalized = normalizeClassRecord(record);
    const duplicate = existing.has(normalized.name);
    return {
      ...normalized,
      currentLevel: duplicate ? getClassLevel((character.occupation || []).find((entry) => getClassName(entry) === normalized.name)) : 0,
      disabled: duplicate,
      reason: duplicate ? 'Already part of this character' : '',
    };
  });
}

export function validateLevelUpSelection(character = {}, className) {
  if (!className) return { valid: false, message: 'Choose a class to advance.' };
  const option = getAvailableLevelUpClasses(character).find((entry) => entry.name === className);
  if (!option) return { valid: false, message: 'Selected class is not on this character.' };
  if (option.disabled) return { valid: false, message: option.reason };
  return { valid: true, message: '' };
}

export function validateAddClassSelection(character = {}, classRecords = [], className) {
  if (!className) return { valid: false, message: 'Choose a new class.' };
  const option = getAvailableNewClasses(character, classRecords).find((entry) => entry.name === className);
  if (!option) return { valid: false, message: 'Selected class is unavailable.' };
  if (option.disabled) return { valid: false, message: option.reason };
  return { valid: true, message: '' };
}
