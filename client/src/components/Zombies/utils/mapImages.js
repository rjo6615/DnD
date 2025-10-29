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

const looksLikeBase64 = (value) => {
  const normalized = trimString(value);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('data:')) {
    return true;
  }

  if (normalized.length % 4 !== 0) {
    return false;
  }

  return /^[A-Za-z0-9+/]+=*$/.test(normalized);
};

const resolveImageValue = (value, fallbackType) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = trimString(value);
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('data:')) {
      return trimmed;
    }

    if (looksLikeBase64(trimmed)) {
      return buildDataUrl(trimmed, fallbackType);
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = resolveImageValue(entry, fallbackType);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const nestedUrl =
    trimString(value.imageUrl) ||
    trimString(value.url) ||
    trimString(value.secureUrl) ||
    trimString(value.href) ||
    trimString(value.src) ||
    trimString(value.path);
  if (nestedUrl) {
    return nestedUrl;
  }

  const nestedDataUrl =
    trimString(value.imageDataUrl) ||
    trimString(value.imageDataURI) ||
    trimString(value.imageDataUri) ||
    trimString(value.dataUrl) ||
    trimString(value.dataURI) ||
    trimString(value.dataUri);
  if (nestedDataUrl) {
    const type =
      trimString(value.imageType) ||
      trimString(value.type) ||
      trimString(value.mimeType) ||
      fallbackType;
    return buildDataUrl(nestedDataUrl, type);
  }

  const nestedBase64 =
    trimString(value.imageBase64) ||
    trimString(value.base64) ||
    trimString(value.base64Data) ||
    trimString(value.base64String) ||
    trimString(value.b64) ||
    trimString(value.data);
  if (nestedBase64) {
    const type =
      trimString(value.imageType) ||
      trimString(value.type) ||
      trimString(value.mimeType) ||
      fallbackType;
    return buildDataUrl(nestedBase64, type);
  }

  const nestedCandidates = [
    value.image,
    value.asset,
    value.background,
    value.backgroundImage,
  ];
  for (const candidate of nestedCandidates) {
    const resolved = resolveImageValue(candidate, fallbackType);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

export const resolveMapImageSource = (map) => {
  if (map === null || typeof map !== 'object') {
    return null;
  }

  const fallbackType = trimString(map.imageType);

  const directCandidates = [
    map.imageUrl,
    map.imageDataUrl,
    map.imageDataURI,
    map.imageDataUri,
    map.imageBase64,
  ];
  for (const candidate of directCandidates) {
    const resolved = resolveImageValue(candidate, fallbackType);
    if (resolved) {
      return resolved;
    }
  }

  const nestedCandidates = [
    map.image,
    map.mapImage,
    map.backgroundImage,
    map.background,
    map.boardImage,
    map.asset,
  ];
  for (const candidate of nestedCandidates) {
    const resolved = resolveImageValue(candidate, fallbackType);
    if (resolved) {
      return resolved;
    }
  }

  if (Array.isArray(map.images)) {
    const resolved = resolveImageValue(map.images, fallbackType);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

export default resolveMapImageSource;
