let cloudinary;
let isConfigured = false;

const DEFAULT_TOKEN_ROOT_FOLDER = 'Tokens';
const TOKEN_FALLBACK_MAX_RESULTS = 200;
const DEFAULT_TOKEN_CACHE_TTL_MS = 60_000;
const DEFAULT_FOLDER_TREE_CACHE_TTL_MS = 120_000;
const DEFAULT_FIGURINE_SUGGESTION_CACHE_TTL_MS = 3_600_000;
const DEFAULT_FOLDER_TREE_CONCURRENCY = 4;
const MAX_FOLDER_TREE_CONCURRENCY = 12;

const tokenListCache = new Map();
const folderTreeCache = new Map();
const figurineSuggestionCache = new Map();

const cloudinaryApiCallCounters = {
  total: 0,
  byAction: new Map(),
};

const normalizeCloudinaryApiAction = (action) => {
  if (typeof action === 'string') {
    const trimmed = action.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return 'unknown';
};

const recordCloudinaryApiCall = (action) => {
  const normalizedAction = normalizeCloudinaryApiAction(action);
  const currentCount = cloudinaryApiCallCounters.byAction.get(normalizedAction) || 0;

  cloudinaryApiCallCounters.total += 1;
  cloudinaryApiCallCounters.byAction.set(normalizedAction, currentCount + 1);

  return normalizedAction;
};

const getCloudinaryApiCallCounts = () => ({
  total: cloudinaryApiCallCounters.total,
  byAction: Object.fromEntries(cloudinaryApiCallCounters.byAction),
});

const resetCloudinaryApiCallCounts = () => {
  cloudinaryApiCallCounters.total = 0;
  cloudinaryApiCallCounters.byAction.clear();
};

const logCloudinaryApiCall = (action, details = {}) => {
  const normalizedAction = recordCloudinaryApiCall(action);
  const { total, byAction } = getCloudinaryApiCallCounts();
  const actionCallCount = byAction[normalizedAction] || 0;

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const payload = {
    action: normalizedAction,
    totalCallCount: total,
    actionCallCount,
    ...details,
  };

  try {
    console.info('[Cloudinary]', JSON.stringify(payload));
  } catch (error) {
    console.info('[Cloudinary]', payload);
  }
};

const parseCacheTtl = (value, fallback) => {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return numericValue;
  }
  return fallback;
};

const getTokenListCacheTtlMs = () =>
  parseCacheTtl(process.env.CLOUDINARY_TOKEN_CACHE_TTL_MS, DEFAULT_TOKEN_CACHE_TTL_MS);

const getFolderTreeCacheTtlMs = () =>
  parseCacheTtl(
    process.env.CLOUDINARY_FOLDER_TREE_CACHE_TTL_MS,
    DEFAULT_FOLDER_TREE_CACHE_TTL_MS
  );

const getFigurineSuggestionCacheTtlMs = () =>
  parseCacheTtl(
    process.env.CLOUDINARY_FIGURINE_SUGGESTION_CACHE_TTL_MS,
    DEFAULT_FIGURINE_SUGGESTION_CACHE_TTL_MS
  );

const parsePositiveInteger = (value, fallback, max) => {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue >= 1) {
    const normalized = Math.floor(numericValue);
    if (Number.isFinite(max) && max >= 1) {
      return Math.min(normalized, max);
    }
    return normalized;
  }

  return fallback;
};

const getFolderTreeConcurrency = () =>
  parsePositiveInteger(
    process.env.CLOUDINARY_FOLDER_TREE_CONCURRENCY,
    DEFAULT_FOLDER_TREE_CONCURRENCY,
    MAX_FOLDER_TREE_CONCURRENCY
  );

const mapWithConcurrency = async (items, mapper, options = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const { concurrency } = options;
  const limit = Math.max(
    1,
    Math.min(
      Number.isInteger(concurrency) && concurrency > 0 ? concurrency : DEFAULT_FOLDER_TREE_CONCURRENCY,
      MAX_FOLDER_TREE_CONCURRENCY,
      items.length
    )
  );

  const results = new Array(items.length);
  let currentIndex = 0;

  const worker = async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const nextIndex = currentIndex;
      currentIndex += 1;

      if (nextIndex >= items.length) {
        break;
      }

      results[nextIndex] = await mapper(items[nextIndex], nextIndex);
    }
  };

  await Promise.all(Array.from({ length: limit }, worker));

  return results;
};

const getCacheEntry = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCacheEntry = (cache, key, value, ttlMs) => {
  if (ttlMs <= 0) {
    return;
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const clearCacheWhenDisabled = (cache, ttlMs) => {
  if (ttlMs <= 0 && cache.size > 0) {
    cache.clear();
  }
};

const getFigurineSuggestionCacheEntry = (key) => {
  const entry = getCacheEntry(figurineSuggestionCache, key);
  if (!entry || typeof entry !== 'object' || entry.__figurineSuggestionCache !== true) {
    return undefined;
  }

  return entry.value;
};

const setFigurineSuggestionCacheEntry = (key, value, ttlMs) => {
  if (!key) {
    return;
  }

  setCacheEntry(figurineSuggestionCache, key, { __figurineSuggestionCache: true, value }, ttlMs);
};

const buildTokenListCacheKey = ({ rootFolder, folders, nextCursor, maxResults }) => {
  const normalizedFolders = Array.isArray(folders) ? folders.slice().sort() : [];
  const serializedFolders = normalizedFolders.length > 0 ? normalizedFolders.join('|') : '__ALL__';
  const normalizedCursor = typeof nextCursor === 'string' ? nextCursor : '';
  const normalizedMaxResults = Number.isInteger(maxResults) ? maxResults : TOKEN_FALLBACK_MAX_RESULTS;

  return [rootFolder || DEFAULT_TOKEN_ROOT_FOLDER, serializedFolders, normalizedCursor, normalizedMaxResults].join(
    '::'
  );
};

const buildFolderTreeCacheKey = ({ rootFolder, folders }) => {
  const normalizedFolders = Array.isArray(folders) ? folders.slice().sort() : [];
  const serializedFolders = normalizedFolders.length > 0 ? normalizedFolders.join('|') : '__ROOT__';
  return [rootFolder || DEFAULT_TOKEN_ROOT_FOLDER, serializedFolders].join('::');
};

const buildFigurineSuggestionCacheKey = ({ keys, includeGeneralSearch, rootFolder }) => {
  if (!Array.isArray(keys) || keys.length === 0) {
    return null;
  }

  const normalizedRoot = sanitizeFolderSegment(rootFolder) || DEFAULT_TOKEN_ROOT_FOLDER;
  const normalizedKeys = Array.from(new Set(keys.filter(Boolean))).sort();
  const scope = includeGeneralSearch ? 'general' : 'restricted';

  if (normalizedKeys.length === 0) {
    return null;
  }

  return [normalizedRoot, scope, normalizedKeys.join('|')].join('::');
};

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

  const cacheTtlMs = getFolderTreeCacheTtlMs();
  clearCacheWhenDisabled(folderTreeCache, cacheTtlMs);

  const cacheKey = buildFolderTreeCacheKey({
    rootFolder: normalizedRoot,
    folders: normalizedTargets,
  });

  if (cacheTtlMs > 0) {
    const cached = getCacheEntry(folderTreeCache, cacheKey);
    if (cached) {
      return cached;
    }
  }

  const visited = new Set();
  const folderFetchConcurrency = getFolderTreeConcurrency();

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

    if (subFolders.length > 0) {
      const childNodes = await mapWithConcurrency(
        subFolders,
        async (subFolder) => buildNode(subFolder.path),
        { concurrency: folderFetchConcurrency }
      );

      childNodes.forEach((childNode) => {
        if (childNode) {
          children.push(childNode);
        }
      });
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

    const targetResults = await mapWithConcurrency(
      normalizedTargets,
      async (target) => {
        if (target === normalizedRoot) {
          const rootChildren = await fetchSubfolders(normalizedRoot);
          if (rootChildren.length === 0) {
            return [];
          }

          const childNodes = await mapWithConcurrency(
            rootChildren,
            async (child) => buildNode(child.path),
            { concurrency: folderFetchConcurrency }
          );

          return childNodes.filter(Boolean);
        }

        const node = await buildNode(target);
        return node ? [node] : [];
      },
      { concurrency: folderFetchConcurrency }
    );

    targetResults.forEach((targetNodes) => {
      if (Array.isArray(targetNodes) && targetNodes.length > 0) {
        nodes.push(...targetNodes);
      }
    });

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

  const result = {
    rootFolder: normalizedRoot,
    folders: foldersTree,
    flatFolders,
  };

  if (cacheTtlMs > 0) {
    setCacheEntry(folderTreeCache, cacheKey, result, cacheTtlMs);
  }

  return result;
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

  const resolvedMaxResults = Number.isInteger(maxResults)
    ? Math.max(1, Math.min(maxResults, 500))
    : TOKEN_FALLBACK_MAX_RESULTS;

  const sanitizedFolders = Array.isArray(folders)
    ? folders
        .map((folder) => sanitizeFolderSegment(folder))
        .filter(Boolean)
    : [];

  const sanitizedNextCursor =
    typeof nextCursor === 'string' && nextCursor.trim() !== '' ? nextCursor.trim() : null;

  const cacheTtlMs = getTokenListCacheTtlMs();
  clearCacheWhenDisabled(tokenListCache, cacheTtlMs);

  const cacheKey = buildTokenListCacheKey({
    rootFolder,
    folders: sanitizedFolders,
    nextCursor: sanitizedNextCursor,
    maxResults: resolvedMaxResults,
  });

  if (cacheTtlMs > 0) {
    const cached = getCacheEntry(tokenListCache, cacheKey);
    if (cached) {
      return cached;
    }
  }

  let search = sdk.search.expression(expression).sort_by('public_id', 'asc');

  search = search.max_results(resolvedMaxResults).with_field('context').with_field('metadata');

  if (sanitizedNextCursor) {
    search = search.next_cursor(sanitizedNextCursor);
  }

  logCloudinaryApiCall('search.execute', {
    context: 'listTokenAssets',
    expression,
    maxResults: resolvedMaxResults,
    nextCursor: sanitizedNextCursor,
    folders: sanitizedFolders,
  });

  const result = await search.execute();
  const resources = Array.isArray(result?.resources) ? result.resources : [];
  const assets = resources
    .map((resource) => sanitizeTokenResource(resource, rootFolder))
    .filter(Boolean);

  const response = {
    assets,
    nextCursor: typeof result?.next_cursor === 'string' ? result.next_cursor : null,
    totalCount: typeof result?.total_count === 'number' ? result.total_count : null,
    appliedFolders: sanitizedFolders,
    rootFolder,
  };

  if (cacheTtlMs > 0) {
    setCacheEntry(tokenListCache, cacheKey, response, cacheTtlMs);
  }

  return response;
};

const DM_FOLDER_HINTS = ['DM', 'DM Only', 'DM-Only', 'DMOnly', '_DM'];
const DM_FOLDER_PATTERN = /(^|\/)dm([ -]?only)?(\/|$)/i;
const CONFIDENT_SUGGESTION_SCORE = 5;

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

    logCloudinaryApiCall('search.execute', {
      context: 'suggestEnemyFigurine',
      expression,
      maxResults,
      folderHints: folderHints || [],
      keys,
    });

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

  const includeGeneral = Boolean(includeGeneralSearch);
  const rootFolder = getTokenRootFolder();
  const cacheTtlMs = getFigurineSuggestionCacheTtlMs();

  clearCacheWhenDisabled(figurineSuggestionCache, cacheTtlMs);

  const cacheKey =
    cacheTtlMs > 0
      ? buildFigurineSuggestionCacheKey({
          keys,
          includeGeneralSearch: includeGeneral,
          rootFolder,
        })
      : null;

  if (cacheTtlMs > 0 && cacheKey) {
    const cachedSuggestion = getFigurineSuggestionCacheEntry(cacheKey);
    if (cachedSuggestion !== undefined) {
      return cachedSuggestion;
    }
  }

  try {
    configure();
  } catch (error) {
    if (cacheTtlMs > 0 && cacheKey) {
      setFigurineSuggestionCacheEntry(cacheKey, null, cacheTtlMs);
    }
    return null;
  }

  const sdk = resolveCloudinary();

  const searchScenarios = [{ folderHints: DM_FOLDER_HINTS }];

  if (includeGeneral) {
    searchScenarios.push({ folderHints: [] });
  }

  let suggestion = null;

  for (const scenario of searchScenarios) {
    suggestion = await executeFigurineSearch(sdk, {
      rootFolder,
      keys,
      folderHints: scenario.folderHints,
    });

    if (suggestion) {
      break;
    }
  }

  if (cacheTtlMs > 0 && cacheKey) {
    setFigurineSuggestionCacheEntry(cacheKey, suggestion || null, cacheTtlMs);
  }

  return suggestion;
};

module.exports = {
  uploadMapImage,
  deleteMapImage,
  getMapFolder,
  getTokenRootFolder,
  listTokenAssets,
  listTokenFolderTree,
  suggestEnemyFigurine,
  getCloudinaryApiCallCounts,
  resetCloudinaryApiCallCounts,
};
