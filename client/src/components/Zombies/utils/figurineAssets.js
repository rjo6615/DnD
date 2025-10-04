const normalizeFigurineValue = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const getNestedValue = (source, path) => {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const segments = path.split('.');
  let current = source;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return null;
    }

    if (typeof current !== 'object') {
      return null;
    }

    if (!(segment in current)) {
      return null;
    }

    current = current[segment];
  }

  return current;
};

const FIGURINE_IMAGE_URL_PATHS = [
  'figurineImageUrl',
  'figurineImage.url',
  'figurineImage.imageUrl',
  'figurine.url',
  'figurine.imageUrl',
  'tokenImageUrl',
  'tokenImage.url',
  'tokenImage.imageUrl',
  'imageUrl',
];

const FIGURINE_IMAGE_PUBLIC_ID_PATHS = [
  'figurineImagePublicId',
  'figurineImage.publicId',
  'figurineImage.cloudinaryPublicId',
  'figurine.publicId',
  'figurine.cloudinaryPublicId',
  'tokenImagePublicId',
  'tokenImage.cloudinaryPublicId',
  'cloudinaryPublicId',
];

const extractFromSource = (source) => {
  if (!source || typeof source !== 'object') {
    return { figurineImageUrl: null, figurineImagePublicId: null };
  }

  const figurineImageUrl = FIGURINE_IMAGE_URL_PATHS.reduce((acc, path) => {
    if (acc) {
      return acc;
    }

    const value = getNestedValue(source, path);
    return normalizeFigurineValue(value);
  }, null);

  const figurineImagePublicId = FIGURINE_IMAGE_PUBLIC_ID_PATHS.reduce((acc, path) => {
    if (acc) {
      return acc;
    }

    const value = getNestedValue(source, path);
    return normalizeFigurineValue(value);
  }, null);

  return { figurineImageUrl, figurineImagePublicId };
};

export const resolveFigurineImageData = (...sources) =>
  sources.reduce(
    (result, source) => {
      if (result.figurineImageUrl && result.figurineImagePublicId) {
        return result;
      }

      const { figurineImageUrl, figurineImagePublicId } = extractFromSource(source);

      return {
        figurineImageUrl: result.figurineImageUrl || figurineImageUrl || null,
        figurineImagePublicId: result.figurineImagePublicId || figurineImagePublicId || null,
      };
    },
    { figurineImageUrl: null, figurineImagePublicId: null }
  );

export default resolveFigurineImageData;
