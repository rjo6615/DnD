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

const addEnemyNameVariantsToScope = (set, name) => {
  const variants = extractEnemyNameVariants(name);
  variants.forEach((variant) => addEnemyScopeValue(set, variant));
};

const addEnemyFolderVariantsToScope = (set, folderPath) => {
  if (typeof folderPath !== 'string') {
    return;
  }

  const normalized = folderPath.replace(/\\+/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return;
  }

  const pathWithTokens = normalized.toLowerCase().startsWith('tokens/')
    ? normalized
    : `Tokens/${normalized}`;

  const variants = new Set([
    pathWithTokens,
    pathWithTokens.replace(/^Tokens\//i, ''),
    pathWithTokens.replace(/^Tokens\/DM\//i, 'DM/'),
    pathWithTokens.replace(/^Tokens\/DM\/Adversaries\//i, 'Adversaries/'),
  ]);

  const segments = pathWithTokens.split('/');
  const leaf = segments[segments.length - 1];
  if (leaf) {
    variants.add(leaf);
  }

  variants.forEach((variant) => {
    addEnemyScopeValue(set, variant);
    addEnemyScopeValue(set, variant.replace(/\//g, ' '));
    addEnemyScopeValue(set, variant.replace(/\//g, '-'));
  });

  addEnemyScopeValue(set, `folder:${pathWithTokens}`);
};

export const buildEnemyTokenFilterScopeValues = (monsterIndex, monsterDetail) => {
  const scopeSet = new Set();

  if (monsterIndex) {
    addEnemyNameVariantsToScope(scopeSet, monsterIndex);
    addEnemyNameVariantsToScope(scopeSet, monsterIndex.replace(/[-_]+/g, ' '));
  }

  if (monsterDetail && typeof monsterDetail === 'object') {
    addEnemyNameVariantsToScope(scopeSet, monsterDetail.name);
  }

  const config =
    (monsterIndex && ENEMY_ADVERSARY_TOKEN_CONFIG[monsterIndex]) ||
    (monsterDetail && ENEMY_ADVERSARY_TOKEN_CONFIG[monsterDetail?.index]);

  if (config) {
    if (Array.isArray(config.aliases)) {
      config.aliases.forEach((alias) => addEnemyNameVariantsToScope(scopeSet, alias));
    }

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
