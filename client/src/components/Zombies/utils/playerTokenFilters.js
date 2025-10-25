import { buildRaceTokenNameVariants } from './raceTokenFilters';

const RACE_NAME_KEYS = ['name', 'Name', 'race', 'Race', 'raceName', 'RaceName', 'race_name'];
const OCCUPATION_NAME_KEYS = [
  'Occupation',
  'Name',
  'occupation',
  'name',
  'Class',
  'class',
];

const extractRaceName = (input) => {
  if (typeof input === 'string') {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return '';
  }

  for (const key of RACE_NAME_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
};

const capitalizeTokenWord = (word) => {
  if (typeof word !== 'string' || word.length === 0) {
    return '';
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const normalizeTokenWords = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return [];
  }

  const cleaned = trimmed
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[\\/]+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(' ')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const buildTokenNameVariantSet = (rawValue) => {
  const variants = new Set();

  if (typeof rawValue !== 'string') {
    return variants;
  }

  const trimmed = rawValue.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return variants;
  }

  variants.add(trimmed);

  const noParens = trimmed.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (noParens) {
    variants.add(noParens);
  }

  const slashNormalized = trimmed.replace(/[\\/]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (slashNormalized) {
    variants.add(slashNormalized);
  }

  const underscoreNormalized = trimmed.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (underscoreNormalized) {
    variants.add(underscoreNormalized);
  }

  const hyphenNormalized = trimmed.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (hyphenNormalized) {
    variants.add(hyphenNormalized);
  }

  variants.forEach((variant) => {
    const words = normalizeTokenWords(variant);
    if (words.length === 0) {
      return;
    }

    const titleWords = words.map(capitalizeTokenWord);
    const lowerWords = words.map((word) => word.toLowerCase());

    [titleWords, lowerWords].forEach((wordList) => {
      const spaceVariant = wordList.join(' ').trim();
      const hyphenVariant = wordList.join('-').trim();
      const underscoreVariant = wordList.join('_').trim();
      const compactVariant = wordList.join('').trim();

      [spaceVariant, hyphenVariant, underscoreVariant, compactVariant].forEach((entry) => {
        if (entry) {
          variants.add(entry);
        }
      });
    });
  });

  return variants;
};

const collectOccupationNames = (occupations) => {
  const names = new Set();

  const addName = (value) => {
    if (typeof value !== 'string') {
      return;
    }

    const trimmedValue = value.replace(/\s+/g, ' ').trim();
    if (trimmedValue) {
      names.add(trimmedValue);
    }
  };

  const entries = Array.isArray(occupations) ? occupations : [occupations];

  entries.forEach((occupation) => {
    if (!occupation) {
      return;
    }

    if (typeof occupation === 'string') {
      addName(occupation);
      return;
    }

    if (typeof occupation !== 'object') {
      return;
    }

    for (const key of OCCUPATION_NAME_KEYS) {
      const candidate = occupation[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        addName(candidate);
        return;
      }
    }

    if (typeof occupation.title === 'string') {
      addName(occupation.title);
    }
  });

  return Array.from(names);
};

const addScopeValue = (set, value) => {
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return;
  }

  set.add(trimmed);
};

export const buildPlayerTokenFolderScope = (raceName, occupations) => {
  const normalizedRaceName = extractRaceName(raceName);
  const raceVariantSet = new Set();
  buildRaceTokenNameVariants(normalizedRaceName).forEach((variant) => {
    if (typeof variant === 'string' && variant.trim()) {
      buildTokenNameVariantSet(variant).forEach((entry) => raceVariantSet.add(entry));
    }
  });

  if (raceVariantSet.size === 0) {
    return null;
  }

  const classVariantSet = new Set();
  collectOccupationNames(occupations).forEach((name) => {
    buildTokenNameVariantSet(name).forEach((entry) => classVariantSet.add(entry));
  });

  const scopeSet = new Set();

  if (classVariantSet.size === 0) {
    raceVariantSet.forEach((raceVariant) => {
      addScopeValue(scopeSet, raceVariant);
      addScopeValue(scopeSet, `Adventurers/${raceVariant}`);
      addScopeValue(scopeSet, `Tokens/Adventurers/${raceVariant}`);
      addScopeValue(scopeSet, `folder:Tokens/Adventurers/${raceVariant}`);
    });

    return scopeSet.size > 0 ? Array.from(scopeSet) : null;
  }

  raceVariantSet.forEach((raceVariant) => {
    classVariantSet.forEach((classVariant) => {
      const base = `${raceVariant}/${classVariant}`;
      addScopeValue(scopeSet, base);
      addScopeValue(scopeSet, `Adventurers/${base}`);
      addScopeValue(scopeSet, `Tokens/Adventurers/${base}`);
      addScopeValue(scopeSet, `folder:Tokens/Adventurers/${base}`);
    });
  });

  return scopeSet.size > 0 ? Array.from(scopeSet) : null;
};

export default buildPlayerTokenFolderScope;
