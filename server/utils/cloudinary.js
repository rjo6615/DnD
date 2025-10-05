let cloudinary;
let isConfigured = false;

const DEFAULT_TOKEN_ROOT_FOLDER = 'Tokens';
const TOKEN_FALLBACK_MAX_RESULTS = 200;

const resolveCloudinary = () => {
  if (!cloudinary) {
    try {
      ({ v2: cloudinary } = require('cloudinary'));
    } catch (error) {
      const missingSdkError = new Error('Cloudinary SDK is not available');
      missingSdkError.cause = error;
      throw missingSdkError;
    }
  }
  return cloudinary;
};

const configure = () => {
  if (isConfigured) {
    return;
  }

  const {
    CLOUDINARY_CLOUD_NAME: cloud_name,
    CLOUDINARY_API_KEY: api_key,
    CLOUDINARY_API_SECRET: api_secret,
  } = process.env;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Cloudinary environment variables are not configured');
  }

  const sdk = resolveCloudinary();
  sdk.config({ cloud_name, api_key, api_secret });
  isConfigured = true;
};

const getMapFolder = () => process.env.CLOUDINARY_MAP_FOLDER || 'Realm Tracker Maps';

const getTokenRootFolder = () =>
  process.env.CLOUDINARY_TOKEN_ROOT_FOLDER || DEFAULT_TOKEN_ROOT_FOLDER;

const escapeExpressionValue = (value) => value.replace(/(["\\])/g, '\\$1');

const sanitizeFolderSegment = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const segments = trimmed
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return segments.join('/');
};

const buildFolderExpressions = (rootFolder, folders = []) => {
  const normalizedRoot = sanitizeFolderSegment(rootFolder) || DEFAULT_TOKEN_ROOT_FOLDER;
  const expressions = [];

  const normalizedFilters = Array.isArray(folders)
    ? folders
        .map((folder) => {
          const sanitized = sanitizeFolderSegment(folder);
          if (!sanitized) {
            return null;
          }

          if (sanitized === normalizedRoot) {
            return sanitized;
          }

          if (sanitized.startsWith(`${normalizedRoot}/`)) {
            return sanitized;
          }

          return `${normalizedRoot}/${sanitized}`;
        })
        .filter(Boolean)
    : [];

  const targets = normalizedFilters.length > 0 ? normalizedFilters : [normalizedRoot];

  targets.forEach((folderPath) => {
    const escaped = escapeExpressionValue(folderPath);
    expressions.push(`folder="${escaped}"`);
    expressions.push(`folder="${escaped}/*"`);
  });

  return expressions;
};

const sanitizeTokenResource = (resource = {}, rootFolder = DEFAULT_TOKEN_ROOT_FOLDER) => {
  if (!resource || typeof resource !== 'object') {
    return null;
  }

  const publicId =
    typeof resource.public_id === 'string' && resource.public_id.trim() !== ''
      ? resource.public_id.trim()
      : null;

  if (!publicId) {
    return null;
  }

  const secureUrl =
    typeof resource.secure_url === 'string' && resource.secure_url.trim() !== ''
      ? resource.secure_url.trim()
      : typeof resource.url === 'string' && resource.url.trim() !== ''
        ? resource.url.trim()
        : null;

  const folder =
    typeof resource.folder === 'string' && resource.folder.trim() !== ''
      ? resource.folder.trim()
      : null;

  const filename =
    typeof resource.filename === 'string' && resource.filename.trim() !== ''
      ? resource.filename.trim()
      : publicId.split('/').pop();

  const relativeFolder = (() => {
    if (!folder) {
      return '';
    }

    const normalizedRoot = sanitizeFolderSegment(rootFolder) || DEFAULT_TOKEN_ROOT_FOLDER;
    const rootPrefix = `${normalizedRoot}/`;
    if (folder === normalizedRoot) {
      return '';
    }
    if (folder.startsWith(rootPrefix)) {
      return folder.slice(rootPrefix.length);
    }
    return folder;
  })();

  return {
    assetId:
      typeof resource.asset_id === 'string' && resource.asset_id.trim() !== ''
        ? resource.asset_id.trim()
        : null,
    publicId,
    secureUrl,
    folder,
    relativeFolder,
    filename,
    format: resource.format || null,
    bytes: typeof resource.bytes === 'number' ? resource.bytes : null,
    width: typeof resource.width === 'number' ? resource.width : null,
    height: typeof resource.height === 'number' ? resource.height : null,
    createdAt: resource.created_at || null,
    metadata:
      resource.metadata && typeof resource.metadata === 'object' ? resource.metadata : null,
    context:
      resource.context && typeof resource.context === 'object' ? resource.context : null,
  };
};

const uploadMapImage = async (image, options = {}) => {
  configure();
  const sdk = resolveCloudinary();
  return sdk.uploader.upload(image, {
    folder: getMapFolder(),
    resource_type: 'image',
    ...options,
  });
};

const deleteMapImage = async (publicId, options = {}) => {
  if (!publicId || typeof publicId !== 'string') {
    throw new Error('A Cloudinary public ID is required to delete an image');
  }

  configure();
  const sdk = resolveCloudinary();
  return sdk.uploader.destroy(publicId, {
    resource_type: 'image',
    ...options,
  });
};

const listTokenFolderTree = async ({ folders = null, rootFolder: inputRootFolder } = {}) => {
  configure();
  const sdk = resolveCloudinary();

  if (!sdk?.api || typeof sdk.api.sub_folders !== 'function') {
    throw new Error('Cloudinary folder API is unavailable');
  }

  const normalizedRoot = sanitizeFolderSegment(inputRootFolder) || getTokenRootFolder();
  const rootPrefix = `${normalizedRoot}/`;

  const normalizeFolderPath = (folderPath) => {
    const sanitized = sanitizeFolderSegment(folderPath);
    if (!sanitized) {
      return null;
    }

    if (sanitized === normalizedRoot || sanitized.startsWith(rootPrefix)) {
      return sanitized;
    }

    return `${normalizedRoot}/${sanitized}`;
  };

  const normalizedTargets = Array.isArray(folders) && folders.length > 0
    ? Array.from(new Set(folders.map(normalizeFolderPath).filter(Boolean)))
    : [normalizedRoot];

  const visited = new Set();

  const fetchSubfolders = async (folderPath) => {
    const results = [];
    let nextCursor = null;

    do {
      const response = await sdk.api.sub_folders(folderPath, {
        max_results: 200,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      });

      const subFolders = Array.isArray(response?.folders) ? response.folders : [];
      subFolders.forEach((folder) => {
        if (!folder || typeof folder.path !== 'string') {
          return;
        }

        const normalizedPath = normalizeFolderPath(folder.path);
        if (!normalizedPath || normalizedPath === folderPath) {
          return;
        }

        const name =
          typeof folder.name === 'string' && folder.name.trim() !== ''
            ? folder.name.trim()
            : normalizedPath.split('/').pop();

        results.push({
          name,
          path: normalizedPath,
        });
      });

      nextCursor =
        typeof response?.next_cursor === 'string' && response.next_cursor.trim() !== ''
          ? response.next_cursor.trim()
          : null;
    } while (nextCursor);

    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  };

  const buildNode = async (folderPath) => {
    const normalizedPath = normalizeFolderPath(folderPath);
    if (!normalizedPath) {
      return null;
    }

    if (visited.has(normalizedPath)) {
      return null;
    }

    visited.add(normalizedPath);

    const relativePath = normalizedPath === normalizedRoot
      ? ''
      : normalizedPath.startsWith(rootPrefix)
        ? normalizedPath.slice(rootPrefix.length)
        : normalizedPath;

    const name = relativePath ? relativePath.split('/').pop() : normalizedPath.split('/').pop();

    const children = [];
    const subFolders = await fetchSubfolders(normalizedPath);
    for (const subFolder of subFolders) {
      const childNode = await buildNode(subFolder.path);
      if (childNode) {
        children.push(childNode);
      }
    }

    return {
      name,
      path: normalizedPath,
      relativePath,
      children,
    };
  };

  const collectNodes = async () => {
    const nodes = [];
    for (const target of normalizedTargets) {
      if (target === normalizedRoot) {
        const rootChildren = await fetchSubfolders(normalizedRoot);
        for (const child of rootChildren) {
          const node = await buildNode(child.path);
          if (node) {
            nodes.push(node);
          }
        }
      } else {
        const node = await buildNode(target);
        if (node) {
          nodes.push(node);
        }
      }
    }

    const uniqueByPath = new Map();
    nodes.forEach((node) => {
      if (node && node.path && !uniqueByPath.has(node.path)) {
        uniqueByPath.set(node.path, node);
      }
    });

    return Array.from(uniqueByPath.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const flattenNodes = (nodes, depth = 0, acc = []) => {
    nodes.forEach((node) => {
      if (!node) {
        return;
      }

      acc.push({
        name: node.name,
        path: node.path,
        relativePath: node.relativePath,
        depth,
        displayPath: node.relativePath || node.name,
      });

      if (Array.isArray(node.children) && node.children.length > 0) {
        flattenNodes(node.children, depth + 1, acc);
      }
    });

    return acc;
  };

  const foldersTree = await collectNodes();
  const flatFolders = flattenNodes(foldersTree);

  return {
    rootFolder: normalizedRoot,
    folders: foldersTree,
    flatFolders,
  };
};

const listTokenAssets = async ({ folders = null, nextCursor = null, maxResults } = {}) => {
  configure();
  const sdk = resolveCloudinary();

  if (!sdk?.search || typeof sdk.search.expression !== 'function') {
    throw new Error('Cloudinary search API is unavailable');
  }

  const rootFolder = getTokenRootFolder();
  const expressionSegments = ['resource_type:image'];
  const folderExpressions = buildFolderExpressions(rootFolder, folders || []);

  if (folderExpressions.length > 0) {
    expressionSegments.push(`(${folderExpressions.join(' OR ')})`);
  }

  const expression = expressionSegments.join(' AND ');
  let search = sdk.search.expression(expression).sort_by('public_id', 'asc');

  const resolvedMaxResults = Number.isInteger(maxResults)
    ? Math.max(1, Math.min(maxResults, 500))
    : TOKEN_FALLBACK_MAX_RESULTS;

  search = search.max_results(resolvedMaxResults).with_field('context').with_field('metadata');

  if (typeof nextCursor === 'string' && nextCursor.trim() !== '') {
    search = search.next_cursor(nextCursor.trim());
  }

  const result = await search.execute();
  const resources = Array.isArray(result?.resources) ? result.resources : [];
  const assets = resources
    .map((resource) => sanitizeTokenResource(resource, rootFolder))
    .filter(Boolean);

  return {
    assets,
    nextCursor: typeof result?.next_cursor === 'string' ? result.next_cursor : null,
    totalCount: typeof result?.total_count === 'number' ? result.total_count : null,
    appliedFolders: Array.isArray(folders)
      ? folders
          .map((folder) => sanitizeFolderSegment(folder))
          .filter(Boolean)
      : [],
    rootFolder,
  };
};

const DM_FOLDER_HINTS = ['DM', 'DM Only', 'DM-Only', 'DMOnly', '_DM'];
const DM_FOLDER_PATTERN = /(^|\/)dm([ -]?only)?(\/|$)/i;
const CONFIDENT_SUGGESTION_SCORE = 8;

const sanitizeMatchKey = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = typeof value === 'string' ? value : String(value);
  const trimmed = stringValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || null;
};

const expandKeyVariants = (value) => {
  const base = sanitizeMatchKey(value);
  if (!base) {
    return [];
  }

  const variants = new Set([base]);

  if (base.includes('-')) {
    variants.add(base.replace(/-/g, ''));
  }

  return Array.from(variants).filter(Boolean);
};

const collectMonsterKeys = (monsterDetail = {}) => {
  if (!monsterDetail || typeof monsterDetail !== 'object') {
    return [];
  }

  const { index, slug, name, type, subtype } = monsterDetail;

  const candidateValues = [
    index,
    slug,
    name,
    subtype,
    type,
    monsterDetail.monster_index,
    monsterDetail.monster_slug,
    monsterDetail.monster_type,
    monsterDetail.monster_subtype,
    monsterDetail.creature_type,
    monsterDetail.creature_subtype,
  ];

  if (typeof name === 'string') {
    const words = name.split(/[^A-Za-z0-9]+/g).filter(Boolean);
    candidateValues.push(...words);
  }

  const sanitized = new Set();
  candidateValues.forEach((value) => {
    expandKeyVariants(value).forEach((variant) => sanitized.add(variant));
  });

  return Array.from(sanitized).filter(Boolean);
};

const collectCandidateTokens = (resource) => {
  const tokens = new Set();

  const addValue = (value) => {
    expandKeyVariants(value).forEach((variant) => tokens.add(variant));
  };

  const crawl = (value) => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(crawl);
      return;
    }

    if (value && typeof value === 'object') {
      Object.values(value).forEach(crawl);
      return;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      addValue(value);
    }
  };

  if (resource.publicId) {
    addValue(resource.publicId);
    resource.publicId
      .split('/')
      .filter(Boolean)
      .forEach((segment) => addValue(segment));
  }

  if (resource.filename) {
    addValue(resource.filename);
  }

  if (resource.metadata) {
    crawl(resource.metadata);
  }

  if (resource.context) {
    crawl(resource.context);
  }

  return tokens;
};

const evaluateResourceMatch = (resource, keys) => {
  if (!resource || !keys || keys.length === 0) {
    return null;
  }

  const candidateTokens = collectCandidateTokens(resource);
  if (candidateTokens.size === 0) {
    return null;
  }

  let score = 0;
  let matchedCount = 0;
  let hasExact = false;

  keys.forEach((key) => {
    let bestForKey = 0;

    candidateTokens.forEach((token) => {
      if (!token || !key) {
        return;
      }

      if (token === key) {
        bestForKey = Math.max(bestForKey, 10);
        hasExact = true;
        return;
      }

      if (token.includes(key)) {
        bestForKey = Math.max(bestForKey, 4);
      } else if (key.includes(token) && token.length >= 3) {
        bestForKey = Math.max(bestForKey, 2);
      }
    });

    if (bestForKey > 0) {
      matchedCount += 1;
      score += bestForKey;
    }
  });

  if (matchedCount === 0) {
    return null;
  }

  const folder = typeof resource.folder === 'string' ? resource.folder : '';
  const isDmFolder = DM_FOLDER_PATTERN.test(folder);
  if (isDmFolder) {
    score += 1;
  }

  return { score, matchedCount, hasExact, isDmFolder };
};

const selectBestSuggestion = (resources, keys, rootFolder) => {
  if (!Array.isArray(resources) || resources.length === 0) {
    return null;
  }

  let best = null;

  resources.forEach((resource) => {
    const sanitized = sanitizeTokenResource(resource, rootFolder);
    if (!sanitized) {
      return;
    }

    const evaluation = evaluateResourceMatch(sanitized, keys);
    if (!evaluation) {
      return;
    }

    if (!best) {
      best = { resource: sanitized, ...evaluation };
      return;
    }

    if (evaluation.score > best.score) {
      best = { resource: sanitized, ...evaluation };
      return;
    }

    if (evaluation.score === best.score) {
      if (evaluation.matchedCount > best.matchedCount) {
        best = { resource: sanitized, ...evaluation };
        return;
      }

      if (evaluation.matchedCount === best.matchedCount) {
        if (evaluation.isDmFolder && !best.isDmFolder) {
          best = { resource: sanitized, ...evaluation };
        }
      }
    }
  });

  if (!best) {
    return null;
  }

  if (!best.hasExact && best.score < CONFIDENT_SUGGESTION_SCORE) {
    return null;
  }

  if (!best.resource || !best.resource.publicId || !best.resource.secureUrl) {
    return null;
  }

  return {
    figurineImageUrl: best.resource.secureUrl,
    figurineImagePublicId: best.resource.publicId,
  };
};

const buildMatchExpressions = (keys) => {
  if (!Array.isArray(keys) || keys.length === 0) {
    return [];
  }

  const metaKeys = [
    'monsterIndex',
    'monster_index',
    'monsterSlug',
    'monster_slug',
    'slug',
    'name',
    'type',
    'subtype',
    'creatureType',
    'creature_type',
    'creatureSubtype',
    'creature_subtype',
  ];

  const expressions = new Set();

  keys.forEach((key) => {
    const variants = expandKeyVariants(key);
    variants.forEach((variant) => {
      const escaped = escapeExpressionValue(variant);
      expressions.add(`public_id="${escaped}"`);
      expressions.add(`public_id="${escapeExpressionValue(`*${variant}*`)}"`);
      expressions.add(`filename="${escaped}"`);
      expressions.add(`filename="${escapeExpressionValue(`*${variant}*`)}"`);
      metaKeys.forEach((metaKey) => {
        expressions.add(`metadata.${metaKey}="${escaped}"`);
      });
    });
  });

  return Array.from(expressions);
};

const executeFigurineSearch = async (sdk, { rootFolder, keys, folderHints }) => {
  if (!sdk?.search || typeof sdk.search.expression !== 'function') {
    return null;
  }

  const matchExpressions = buildMatchExpressions(keys);
  if (matchExpressions.length === 0) {
    return null;
  }

  const expressionSegments = ['resource_type:image'];
  const folderExpressions = buildFolderExpressions(rootFolder, folderHints || []);

  if (folderExpressions.length > 0) {
    expressionSegments.push(`(${folderExpressions.join(' OR ')})`);
  }

  expressionSegments.push(`(${matchExpressions.join(' OR ')})`);

  const expression = expressionSegments.join(' AND ');

  const maxResults = Math.min(Math.max(keys.length * 20, 50), TOKEN_FALLBACK_MAX_RESULTS);

  try {
    let search = sdk.search.expression(expression).sort_by('public_id', 'asc');
    search = search
      .max_results(maxResults)
      .with_field('context')
      .with_field('metadata');

    const result = await search.execute();
    const resources = Array.isArray(result?.resources) ? result.resources : [];

    return selectBestSuggestion(resources, keys, rootFolder);
  } catch (error) {
    return null;
  }
};

const suggestEnemyFigurine = async (monsterDetail, { includeGeneralSearch = true } = {}) => {
  const keys = collectMonsterKeys(monsterDetail);
  if (keys.length === 0) {
    return null;
  }

  try {
    configure();
  } catch (error) {
    return null;
  }

  const sdk = resolveCloudinary();
  const rootFolder = getTokenRootFolder();

  const searchScenarios = [
    { folderHints: DM_FOLDER_HINTS },
  ];

  if (includeGeneralSearch) {
    searchScenarios.push({ folderHints: [] });
  }

  for (const scenario of searchScenarios) {
    const suggestion = await executeFigurineSearch(sdk, {
      rootFolder,
      keys,
      folderHints: scenario.folderHints,
    });

    if (suggestion) {
      return suggestion;
    }
  }

  return null;
};

module.exports = {
  uploadMapImage,
  deleteMapImage,
  getMapFolder,
  getTokenRootFolder,
  listTokenAssets,
  listTokenFolderTree,
  suggestEnemyFigurine,
};
