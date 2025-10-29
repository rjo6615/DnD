const trimString = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const buildDataUrl = (base64Value, mimeType) => {
  const normalizedBase64 = trimString(base64Value);
  if (normalizedBase64 === null) {
    return null;
  }

  if (normalizedBase64.startsWith('data:')) {
    return normalizedBase64;
  }

  const type = trimString(mimeType) || 'image/png';
  return `data:${type};base64,${normalizedBase64}`;
};

const extractNestedImage = (image) => {
  if (image === null || typeof image !== 'object') {
    return null;
  }

  const nestedUrl =
    trimString(image.url) ||
    trimString(image.secureUrl) ||
    trimString(image.href) ||
    trimString(image.src);
  if (nestedUrl) {
    return nestedUrl;
  }

  const nestedDataUrl =
    trimString(image.dataUrl) ||
    trimString(image.dataURI) ||
    trimString(image.dataUri);
  if (nestedDataUrl) {
    const type = trimString(image.type) || trimString(image.mimeType);
    return buildDataUrl(nestedDataUrl, type);
  }

  const nestedBase64 =
    trimString(image.base64) ||
    trimString(image.base64Data) ||
    trimString(image.base64String) ||
    trimString(image.b64) ||
    trimString(image.data);
  if (nestedBase64) {
    const type = trimString(image.type) || trimString(image.mimeType);
    return buildDataUrl(nestedBase64, type);
  }

  return null;
};

export const resolveMapImageSource = (map) => {
  if (map === null || typeof map !== 'object') {
    return null;
  }

  const directUrl = trimString(map.imageUrl);
  if (directUrl) {
    return directUrl;
  }

  const directDataUrl =
    trimString(map.imageDataUrl) ||
    trimString(map.imageDataURI) ||
    trimString(map.imageDataUri);
  if (directDataUrl) {
    return buildDataUrl(directDataUrl, map.imageType);
  }

  const directBase64 = trimString(map.imageBase64);
  if (directBase64) {
    return buildDataUrl(directBase64, map.imageType);
  }

  const nestedImage = extractNestedImage(map.image);
  if (nestedImage) {
    return nestedImage;
  }

  if (Array.isArray(map.images)) {
    for (const entry of map.images) {
      const resolved = extractNestedImage(entry);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
};

export default resolveMapImageSource;
