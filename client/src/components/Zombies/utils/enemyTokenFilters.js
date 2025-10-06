const ENEMY_ADVERSARY_TOKEN_CONFIG = {
  bandit: {
    folders: ['DM/Adversaries/Bandits'],
    aliases: ['Bandit', 'Bandits'],
  },
  bugbear: {
    folders: ['DM/Adversaries/Bugbears'],
    aliases: ['Bugbear', 'Bugbears'],
  },
  cultist: {
    folders: ['DM/Adversaries/Cultists'],
    aliases: ['Cultist', 'Cultists'],
  },
  ghoul: {
    folders: ['DM/Adversaries/Ghouls'],
    aliases: ['Ghoul', 'Ghouls'],
  },
  'giant-spider': {
    folders: ['DM/Adversaries/Giant Spiders'],
    aliases: ['Giant Spider', 'Giant Spiders'],
  },
  'giant-wolf-spider': {
    folders: ['DM/Adversaries/Giant Wolf Spiders'],
    aliases: ['Giant Wolf Spider', 'Giant Wolf Spiders'],
  },
  goblin: {
    folders: ['DM/Adversaries/Goblins'],
    aliases: ['Goblin', 'Goblins'],
  },
  hobgoblin: {
    folders: ['DM/Adversaries/Hobgoblins'],
    aliases: ['Hobgoblin', 'Hobgoblins'],
  },
  kobold: {
    folders: ['DM/Adversaries/Kobolds'],
    aliases: ['Kobold', 'Kobolds'],
  },
  ogre: {
    folders: ['DM/Adversaries/Ogres'],
    aliases: ['Ogre', 'Ogres'],
  },
  orc: {
    folders: ['DM/Adversaries/Orcs'],
    aliases: ['Orc', 'Orcs'],
  },
  skeleton: {
    folders: ['DM/Adversaries/Skeletons'],
    aliases: ['Skeleton', 'Skeletons'],
  },
  wolf: {
    folders: ['DM/Adversaries/Wolves'],
    aliases: ['Wolf', 'Wolves'],
  },
  worg: {
    folders: ['DM/Adversaries/Worgs'],
    aliases: ['Worg', 'Worgs'],
  },
  zombie: {
    folders: ['DM/Adversaries/Zombies'],
    aliases: ['Zombie', 'Zombies'],
  },
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
  if (typeof name !== 'string') {
    return;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const lower = trimmed.toLowerCase();
  const hyphenated = trimmed.replace(/\s+/g, '-');
  const spaced = trimmed.replace(/[-_/]+/g, ' ');

  [trimmed, lower, hyphenated, hyphenated.toLowerCase(), spaced, spaced.toLowerCase()].forEach(
    (variant) => addEnemyScopeValue(set, variant)
  );

  const compactBase = spaced.toLowerCase();

  if (compactBase && !compactBase.endsWith('s')) {
    addEnemyScopeValue(set, `${compactBase}s`);
  }

  if (compactBase.endsWith('y')) {
    addEnemyScopeValue(set, `${compactBase.slice(0, -1)}ies`);
  } else if (compactBase.endsWith('fe')) {
    addEnemyScopeValue(set, `${compactBase.slice(0, -2)}ves`);
  } else if (compactBase.endsWith('f')) {
    addEnemyScopeValue(set, `${compactBase.slice(0, -1)}ves`);
  } else if (compactBase.endsWith('man')) {
    addEnemyScopeValue(set, `${compactBase.slice(0, -3)}men`);
  } else if (compactBase.endsWith('lf')) {
    addEnemyScopeValue(set, `${compactBase.slice(0, -1)}ves`);
  }

  if (
    compactBase.endsWith('s') ||
    compactBase.endsWith('x') ||
    compactBase.endsWith('z') ||
    compactBase.endsWith('ch') ||
    compactBase.endsWith('sh')
  ) {
    addEnemyScopeValue(set, `${compactBase}es`);
  }
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

  return scopeSet.size > 0 ? Array.from(scopeSet) : null;
};

export default buildEnemyTokenFilterScopeValues;

export { ENEMY_ADVERSARY_TOKEN_CONFIG };
