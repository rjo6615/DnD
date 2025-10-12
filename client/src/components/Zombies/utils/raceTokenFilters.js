const capitalizeTokenWord = (word) => {
  if (typeof word !== 'string' || word.length === 0) {
    return '';
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

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

export const buildRaceTokenNameVariants = (raceName) => {
  if (typeof raceName !== 'string') {
    return [];
  }

  const normalized = raceName.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const hyphenNormalized = normalized.replace(/\s*-\s*/g, '-');
  const baseWords = hyphenNormalized
    .split(/[-\s]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (baseWords.length === 0) {
    return [];
  }

  const separators = [' ', '-', ''];
  const variantSet = new Set();

  const addVariantsForWords = (words) => {
    separators.forEach((separator) => {
      const variant = words.map(capitalizeTokenWord).join(separator).trim();
      if (variant) {
        variantSet.add(variant);
      }
    });
  };

  addVariantsForWords(baseWords);

  const pluralWords = [...baseWords];
  pluralWords[pluralWords.length - 1] = pluralizeTokenWord(pluralWords[pluralWords.length - 1]);
  addVariantsForWords(pluralWords);

  variantSet.add(hyphenNormalized);

  return Array.from(variantSet).filter(Boolean);
};

const normalizeSize = (size) => {
  if (typeof size !== 'string') {
    return null;
  }

  const trimmed = size.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  return trimmed;
};

const SMALLFOLK_RACE_KEYWORDS = ['gnome', 'halfling', 'human', 'tiefling'];

export const buildRaceTokenScopeData = (raceName, options = {}) => {
  const nameVariants = buildRaceTokenNameVariants(raceName);

  const normalizedOptions = options && typeof options === 'object' ? options : {};
  const normalizedSize = normalizeSize(normalizedOptions.size);
  const normalizedRaceName = typeof raceName === 'string' ? raceName.toLowerCase() : '';

  const isSmallSize = normalizedSize === 'small';
  const isSmallfolkRace = SMALLFOLK_RACE_KEYWORDS.some(
    (keyword) => keyword && normalizedRaceName.includes(keyword)
  );
  const shouldUseSmallfolk = isSmallSize && isSmallfolkRace;

  if (nameVariants.length === 0) {
    return {
      nameVariants: [],
      prefixes: [],
    };
  }

  const prefixSet = new Set();

  const baseSmallfolkPrefixes = ['Smallfolk', 'Adventurers/Smallfolk', 'Tokens/Adventurers/Smallfolk'];

  nameVariants.forEach((variant) => {
    const trimmed = typeof variant === 'string' ? variant.trim() : '';
    if (!trimmed) {
      return;
    }

    if (shouldUseSmallfolk) {
      baseSmallfolkPrefixes.forEach((prefix) => {
        if (typeof prefix === 'string' && prefix.trim() !== '') {
          prefixSet.add(`${prefix}/${trimmed}`);
        }
      });
    } else {
      prefixSet.add(trimmed);
      prefixSet.add(`Adventurers/${trimmed}`);
      prefixSet.add(`Tokens/Adventurers/${trimmed}`);
    }
  });

  return {
    nameVariants,
    prefixes: Array.from(prefixSet).filter(Boolean),
    isSmallfolk: shouldUseSmallfolk,
  };
};

export default buildRaceTokenScopeData;
