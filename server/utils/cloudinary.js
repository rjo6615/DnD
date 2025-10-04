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

module.exports = {
  uploadMapImage,
  deleteMapImage,
  getMapFolder,
  getTokenRootFolder,
  listTokenAssets,
};
