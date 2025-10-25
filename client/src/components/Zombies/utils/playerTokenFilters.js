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

const IRREGULAR_PLURALS = new Set([
  'people',
  'men',
  'children',
  'teeth',
  'feet',
  'mice',
  'geese',
]);

const pluralizeTokenWord = (word) => {
  if (typeof word !== 'string' || word.length === 0) {
    return word;
  }

  const lower = word.toLowerCase();

  if (lower.endsWith('person')) {
    return `${lower.slice(0, -6)}people`;
  }

  if (lower === 'human') {
    return 'humans';
  }

  if (lower.endsWith('man')) {
    return `${lower.slice(0, -3)}men`;
  }

  if (lower.endsWith('child')) {
    return `${lower.slice(0, -5)}children`;
  }

  if (lower.endsWith('tooth')) {
    return `${lower.slice(0, -5)}teeth`;
  }

  if (lower.endsWith('foot')) {
    return `${lower.slice(0, -4)}feet`;
  }

  if (lower.endsWith('mouse')) {
    return `${lower.slice(0, -5)}mice`;
  }

  if (lower.endsWith('goose')) {
    return `${lower.slice(0, -5)}geese`;
  }

  if (lower.endsWith('lf')) {
    return `${lower.slice(0, -1)}ves`;
  }

  if (lower.endsWith('fe')) {
    return `${lower.slice(0, -2)}ves`;
  }

  if (lower.endsWith('f')) {
    return `${lower.slice(0, -1)}ves`;
  }

  if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
    return `${lower.slice(0, -1)}ies`;
  }

  if (/([sxz]|ch|sh)$/.test(lower)) {
    return `${lower}es`;
  }

  return `${lower}s`;
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

    const pluralWords = [...words];
    const lastIndex = pluralWords.length - 1;

    if (lastIndex >= 0) {
      const baseLower = pluralWords[lastIndex].toLowerCase();

      if (!IRREGULAR_PLURALS.has(baseLower) && !baseLower.endsWith('s')) {
        const pluralLower = pluralizeTokenWord(pluralWords[lastIndex]);

        if (pluralLower && pluralLower !== baseLower) {
          pluralWords[lastIndex] = pluralLower;

          const pluralTitleWords = pluralWords.map(capitalizeTokenWord);
          const pluralLowerWords = pluralWords.map((word) => word.toLowerCase());

          [pluralTitleWords, pluralLowerWords].forEach((wordList) => {
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
        }
      }
    }
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

const createScopeCollector = () => {
  const seen = new Set();
  const values = [];

  const add = (value) => {
    if (typeof value !== 'string') {
      return;
    }

    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    values.push(trimmed);
  };

  return {
    add,
    values,
    has: (value) => seen.has(value),
  };
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

  const raceCollector = createScopeCollector();

  raceVariantSet.forEach((raceVariant) => {
    raceCollector.add(raceVariant);
    raceCollector.add(`Adventurers/${raceVariant}`);
    raceCollector.add(`Tokens/Adventurers/${raceVariant}`);
    raceCollector.add(`folder:Tokens/Adventurers/${raceVariant}`);
  });

  if (classVariantSet.size === 0) {
    return raceCollector.values.length > 0 ? raceCollector.values : null;
  }

  const classCollector = createScopeCollector();

  raceVariantSet.forEach((raceVariant) => {
    classVariantSet.forEach((classVariant) => {
      const base = `${raceVariant}/${classVariant}`;
      classCollector.add(base);
      classCollector.add(`Adventurers/${base}`);
      classCollector.add(`Tokens/Adventurers/${base}`);
      classCollector.add(`folder:Tokens/Adventurers/${base}`);
    });
  });

  if (classCollector.values.length === 0) {
    return raceCollector.values.length > 0 ? raceCollector.values : null;
  }

  const combinedValues = [...classCollector.values];

  raceCollector.values.forEach((value) => {
    if (!classCollector.has(value)) {
      combinedValues.push(value);
    }
  });

  return combinedValues.length > 0 ? combinedValues : null;
};

export default buildPlayerTokenFolderScope;
