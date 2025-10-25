import buildRaceTokenScopeData from './raceTokenFilters';

const addScopeVariantsToSet = (scopeSet, rawValue, prefixes = [], options = {}) => {
  if (!scopeSet || typeof scopeSet.add !== 'function') {
    return;
  }

  if (typeof rawValue !== 'string') {
    return;
  }

  const normalizedValue = rawValue.replace(/\s+/g, ' ').trim();
  if (!normalizedValue) {
    return;
  }

  const lowerValue = normalizedValue.toLowerCase();
  const compactValue = lowerValue.replace(/[^a-z0-9]/g, '');

  const normalizedPrefixes = Array.isArray(prefixes)
    ? prefixes.map((prefix) =>
        typeof prefix === 'string' ? prefix.replace(/\s+/g, ' ').trim() : ''
      )
    : [];

  const includeStandalone =
    options.includeStandalone ?? normalizedPrefixes.filter(Boolean).length === 0;

  if (includeStandalone) {
    [normalizedValue, lowerValue, compactValue]
      .filter(Boolean)
      .forEach((entry) => scopeSet.add(entry));
  }

  normalizedPrefixes
    .filter(Boolean)
    .forEach((prefix) => {
      scopeSet.add(`${prefix}/${normalizedValue}`);
      scopeSet.add(`${prefix}/${lowerValue}`);
      if (compactValue) {
        scopeSet.add(`${prefix}/${compactValue}`);
      }
    });
};

export const buildTokenPickerScope = ({
  raceName,
  occupations,
  sizeFolder,
  buildRaceScopeData = buildRaceTokenScopeData,
} = {}) => {
  const scopeSet = new Set();

  const raceScopeResult =
    typeof buildRaceScopeData === 'function'
      ? buildRaceScopeData(raceName)
      : buildRaceTokenScopeData(raceName);
  const raceNameVariants = Array.isArray(raceScopeResult?.nameVariants)
    ? raceScopeResult.nameVariants
    : [];
  const racePrefixList = Array.isArray(raceScopeResult?.prefixes)
    ? raceScopeResult.prefixes
    : [];

  const normalizedSizeFolder =
    typeof sizeFolder === 'string' && sizeFolder.trim() !== ''
      ? sizeFolder.trim()
      : 'Mediumfolk';

  const sizePrefixes = [
    `Core_Class_Tokens/${normalizedSizeFolder}`,
    `Adventurers/Core_Class_Tokens/${normalizedSizeFolder}`,
    `Tokens/Adventurers/Core_Class_Tokens/${normalizedSizeFolder}`,
  ];

  const seenClasses = new Set();
  let hasRaceSpecificClassScope = false;

  (Array.isArray(occupations) ? occupations : []).forEach((occupation) => {
    if (!occupation || typeof occupation !== 'object') {
      return;
    }

    const rawClassName =
      typeof occupation.Occupation === 'string'
        ? occupation.Occupation.replace(/\s+/g, ' ').trim()
        : '';
    if (!rawClassName) {
      return;
    }

    const classKey = rawClassName.toLowerCase();
    if (seenClasses.has(classKey)) {
      return;
    }
    seenClasses.add(classKey);

    addScopeVariantsToSet(scopeSet, rawClassName, [
      'Core_Class_Tokens',
      'Adventurers/Core_Class_Tokens',
      'Tokens/Adventurers/Core_Class_Tokens',
    ]);

    addScopeVariantsToSet(scopeSet, rawClassName, sizePrefixes);

    if (Array.isArray(racePrefixList) && racePrefixList.length > 0) {
      addScopeVariantsToSet(scopeSet, rawClassName, racePrefixList);
      hasRaceSpecificClassScope = true;
    }
  });

  if (!hasRaceSpecificClassScope) {
    raceNameVariants.forEach((variant) => {
      addScopeVariantsToSet(scopeSet, variant, [
        'Adventurers',
        'Tokens/Adventurers',
      ]);
    });
  }

  if (scopeSet.size === 0 && raceNameVariants.length > 0) {
    const fallbackRace = raceNameVariants.find(
      (variant) => typeof variant === 'string' && variant.trim() !== ''
    );
    if (fallbackRace) {
      addScopeVariantsToSet(scopeSet, fallbackRace, [
        'Adventurers',
        'Tokens/Adventurers',
      ]);
    }
  }

  return Array.from(scopeSet);
};

export default buildTokenPickerScope;
