const ENEMY_ADVERSARY_TOKEN_CONFIG = {
  bandit: {
    folders: ['Adversaries/Bandits'],
    aliases: ['Bandit', 'Bandits'],
  },
  bugbear: {
    folders: ['Adversaries/Bugbears'],
    aliases: ['Bugbear', 'Bugbears'],
  },
  cultist: {
    folders: ['Adversaries/Cultists'],
    aliases: ['Cultist', 'Cultists'],
  },
  ghoul: {
    folders: ['Adversaries/Ghouls'],
    aliases: ['Ghoul', 'Ghouls'],
  },
  'giant-spider': {
    folders: ['Adversaries/Giant Spiders'],
    aliases: ['Giant Spider', 'Giant Spiders'],
  },
  'giant-wolf-spider': {
    folders: ['Adversaries/Giant Wolf Spiders'],
    aliases: ['Giant Wolf Spider', 'Giant Wolf Spiders'],
  },
  goblin: {
    folders: ['Adversaries/Goblins'],
    aliases: ['Goblin', 'Goblins'],
  },
  hobgoblin: {
    folders: ['Adversaries/Hobgoblins'],
    aliases: ['Hobgoblin', 'Hobgoblins'],
  },
  kobold: {
    folders: ['Adversaries/Kobolds'],
    aliases: ['Kobold', 'Kobolds'],
  },
  ogre: {
    folders: ['Adversaries/Ogres'],
    aliases: ['Ogre', 'Ogres'],
  },
  orc: {
    folders: ['Adversaries/Orcs'],
    aliases: ['Orc', 'Orcs'],
  },
  skeleton: {
    folders: ['Adversaries/Skeletons'],
    aliases: ['Skeleton', 'Skeletons'],
  },
  wolf: {
    folders: ['Adversaries/Wolves'],
    aliases: ['Wolf', 'Wolves'],
  },
  worg: {
    folders: ['Adversaries/Worgs'],
    aliases: ['Worg', 'Worgs'],
  },
  zombie: {
    folders: ['Adversaries/Zombies'],
    aliases: ['Zombie', 'Zombies'],
  },
};

const capitalizeWord = (word) => {
  if (typeof word !== 'string' || word.length === 0) {
    return '';
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const extractEnemyNameVariants = (name) => {
  if (typeof name !== 'string') {
    return new Set();
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return new Set();
  }

  const segments = trimmed
    .split(/[-_\s]+/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return new Set([trimmed]);
  }

  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  const spaced = segments.join(' ');
  const spacedLower = lowerSegments.join(' ');
  const hyphenated = segments.join('-');
  const hyphenatedLower = lowerSegments.join('-');
  const underscored = segments.join('_');
  const underscoredLower = lowerSegments.join('_');
  const compact = segments.join('');
  const compactLower = lowerSegments.join('');
  const titleCase = segments.map(capitalizeWord).join(' ');
  const pascalCase = segments.map(capitalizeWord).join('');

  const variants = new Set([
    trimmed,
    spaced,
    spacedLower,
    hyphenated,
    hyphenatedLower,
    underscored,
    underscoredLower,
    compact,
    compactLower,
    titleCase,
    pascalCase,
  ]);

  const compactBase = spacedLower;

  if (compactBase) {
    if (!compactBase.endsWith('s')) {
      variants.add(`${compactBase}s`);
    }

    if (compactBase.endsWith('y')) {
      variants.add(`${compactBase.slice(0, -1)}ies`);
    } else if (compactBase.endsWith('fe')) {
      variants.add(`${compactBase.slice(0, -2)}ves`);
    } else if (compactBase.endsWith('f')) {
      variants.add(`${compactBase.slice(0, -1)}ves`);
    } else if (compactBase.endsWith('man')) {
      variants.add(`${compactBase.slice(0, -3)}men`);
    } else if (compactBase.endsWith('lf')) {
      variants.add(`${compactBase.slice(0, -1)}ves`);
    }

    if (
      compactBase.endsWith('s') ||
      compactBase.endsWith('x') ||
      compactBase.endsWith('z') ||
      compactBase.endsWith('ch') ||
      compactBase.endsWith('sh')
    ) {
      variants.add(`${compactBase}es`);
    }
  }

  return new Set(Array.from(variants).filter(Boolean));
};

const addEnemyScopeValue = (set, value) => {
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  set.add(trimmed);
};

const normalizeAdversaryFolderPath = (folderPath) => {
  if (typeof folderPath !== 'string') {
    return null;
  }

  const normalized = folderPath
    .replace(/[\\]+/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  if (normalized[0].toLowerCase() !== 'tokens') {
    normalized.unshift('Tokens');
  } else {
    normalized[0] = 'Tokens';
  }

  if (normalized.length >= 3 && normalized[1].toLowerCase() === 'dm') {
    normalized.splice(1, 1);
  }

  if (normalized.length < 3 || normalized[1].toLowerCase() !== 'adversaries') {
    return null;
  }

  normalized[1] = 'Adversaries';

  return normalized.join('/');
};

const addEnemyFolderVariantsToScope = (set, folderPath) => {
  const pathWithTokens = normalizeAdversaryFolderPath(folderPath);

  if (!pathWithTokens) {
    return;
  }

  const variants = new Set([pathWithTokens, pathWithTokens.replace(/^Tokens\//i, '')]);

  variants.forEach((variant) => {
    addEnemyScopeValue(set, variant);
    addEnemyScopeValue(set, `folder:${variant}`);
  });
};

export const buildEnemyTokenFilterScopeValues = (monsterIndex, monsterDetail) => {
  const scopeSet = new Set();

  const config =
    (monsterIndex && ENEMY_ADVERSARY_TOKEN_CONFIG[monsterIndex]) ||
    (monsterDetail && ENEMY_ADVERSARY_TOKEN_CONFIG[monsterDetail?.index]);

  if (config) {
    const folders = Array.isArray(config.folders) ? config.folders : config.folder ? [config.folder] : [];
    folders.forEach((folder) => addEnemyFolderVariantsToScope(scopeSet, folder));
  }

  const folderNameCandidates = new Set();
  extractEnemyNameVariants(monsterIndex).forEach((variant) => folderNameCandidates.add(variant));
  if (monsterDetail && typeof monsterDetail === 'object') {
    extractEnemyNameVariants(monsterDetail.index).forEach((variant) =>
      folderNameCandidates.add(variant)
    );
    extractEnemyNameVariants(monsterDetail.name).forEach((variant) =>
      folderNameCandidates.add(variant)
    );
  }

  if (config && Array.isArray(config.aliases)) {
    config.aliases.forEach((alias) =>
      extractEnemyNameVariants(alias).forEach((variant) => folderNameCandidates.add(variant))
    );
  }

  folderNameCandidates.forEach((candidate) => {
    if (typeof candidate !== 'string') {
      return;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      return;
    }

    const baseSegments = trimmed
      .split(/[\\/]+/g)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (baseSegments.length === 0) {
      return;
    }

    const normalizedWords = baseSegments
      .join(' ')
      .split(/\s+/g)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (normalizedWords.length === 0) {
      return;
    }

    const titleCase = normalizedWords.map(capitalizeWord).join(' ');
    const baseNameVariants = new Set([
      normalizedWords.join(' '),
      normalizedWords.join('-'),
      normalizedWords.join('_'),
      normalizedWords.join(''),
      titleCase,
      titleCase.replace(/\s+/g, '-'),
      titleCase.replace(/\s+/g, ''),
    ]);

    baseNameVariants.forEach((variantName) => {
      if (!variantName) {
        return;
      }

      addEnemyFolderVariantsToScope(scopeSet, `Tokens/Adversaries/${variantName}`);
    });
  });

  return scopeSet.size > 0 ? Array.from(scopeSet) : null;
};

export default buildEnemyTokenFilterScopeValues;

export { ENEMY_ADVERSARY_TOKEN_CONFIG };
