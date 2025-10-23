const DEFAULT_PERSISTENT_FOLDER_TREE_CACHE_TTL_MS = 21_600_000; // 6 hours
const TOKEN_FOLDER_CACHE_COLLECTION = 'CloudinaryTokenFolderCache';

const parseCacheTtl = (value, fallback) => {
  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return fallback;
};

const getPersistentFolderTreeCacheTtlMs = () =>
  parseCacheTtl(
    process.env.CLOUDINARY_PERSISTENT_FOLDER_TREE_CACHE_TTL_MS,
    DEFAULT_PERSISTENT_FOLDER_TREE_CACHE_TTL_MS
  );

const normalizeFolderList = (folders) => {
  if (!Array.isArray(folders) || folders.length === 0) {
    return [];
  }

  const normalized = folders
    .map((folder) => (typeof folder === 'string' ? folder.trim() : ''))
    .filter(Boolean);

  if (normalized.length === 0) {
    return [];
  }

  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
};

const buildTokenFolderCacheKey = ({
  role = 'dm',
  rootFolder = '',
  folders = [],
  playerRootFolder = '',
} = {}) => {
  const normalizedRole = role === 'player' ? 'player' : 'dm';
  const normalizedRoot = typeof rootFolder === 'string' ? rootFolder.trim() : '';
  const normalizedPlayerRoot =
    normalizedRole === 'player' && typeof playerRootFolder === 'string'
      ? playerRootFolder.trim()
      : '';
  const normalizedFolders = normalizeFolderList(folders);

  const keyParts = ['tokenFolders', normalizedRole];

  if (normalizedRoot) {
    keyParts.push(`root=${normalizedRoot}`);
  }

  if (normalizedPlayerRoot) {
    keyParts.push(`playerRoot=${normalizedPlayerRoot}`);
  }

  if (normalizedFolders.length > 0) {
    keyParts.push(`folders=${normalizedFolders.join('|')}`);
  }

  return keyParts.join('::');
};

const getCacheCollection = (db) => {
  if (!db || typeof db.collection !== 'function') {
    return null;
  }

  return db.collection(TOKEN_FOLDER_CACHE_COLLECTION);
};

const getCachedTokenFolderTree = async (db, key) => {
  if (!key) {
    return null;
  }

  const collection = getCacheCollection(db);
  if (!collection) {
    return null;
  }

  const now = new Date();
  const doc = await collection.findOne({ key, expiresAt: { $gt: now } });

  if (!doc || typeof doc.value !== 'object') {
    return null;
  }

  return doc.value;
};

const setCachedTokenFolderTree = async (db, key, value, ttlMs) => {
  if (!key || !value || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return;
  }

  const collection = getCacheCollection(db);
  if (!collection) {
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  await collection.updateOne(
    { key },
    {
      $set: {
        key,
        value,
        updatedAt: now,
        expiresAt,
      },
    },
    { upsert: true }
  );

  try {
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (error) {
    // Ignore index errors (e.g., insufficient permissions). The cache will still function without TTL cleanup.
  }
};

module.exports = {
  buildTokenFolderCacheKey,
  getCachedTokenFolderTree,
  setCachedTokenFolderTree,
  getPersistentFolderTreeCacheTtlMs,
};
