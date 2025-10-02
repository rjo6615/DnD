const { randomUUID } = require('crypto');
const createMapSchema = require('../schemas/map');

let mapSchemas;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getMapSchemas = () => {
  if (!mapSchemas) {
    const { z } = require('zod');
    mapSchemas = createMapSchema(z);
  }
  return mapSchemas;
};

const generateStableId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const isIsoDate = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
};

const toIsoDate = (value, fallback) => {
  if (isIsoDate(value)) {
    return new Date(value).toISOString();
  }
  return fallback;
};

const sortMaps = (maps) => {
  return [...maps].sort((a, b) => {
    const aTime = Date.parse(a?.updatedAt ?? 0) || 0;
    const bTime = Date.parse(b?.updatedAt ?? 0) || 0;
    return bTime - aTime;
  });
};

const clampPercentage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 1) {
    return 1;
  }
  return parsed;
};

const normalizeMapTokens = ({ mapTokens, validMapIds = new Set(), now }) => {
  const normalizedTokens = {};
  let didMutate = false;

  if (!mapTokens || typeof mapTokens !== 'object' || Array.isArray(mapTokens)) {
    if (mapTokens && typeof mapTokens === 'object') {
      didMutate = true;
    }
    return { tokensByMapId: normalizedTokens, didMutate };
  }

  const timestamp = toIsoDate(now, new Date().toISOString()) || new Date().toISOString();

  Object.keys(mapTokens).forEach((rawMapId) => {
    const value = mapTokens[rawMapId];
    if (typeof rawMapId !== 'string') {
      didMutate = true;
      return;
    }

    const mapId = rawMapId.trim();
    if (!mapId) {
      didMutate = true;
      return;
    }

    if (validMapIds.size > 0 && !validMapIds.has(mapId)) {
      didMutate = true;
      return;
    }

    if (!value || typeof value !== 'object') {
      if (value !== undefined && value !== null) {
        didMutate = true;
      }
      return;
    }

    const tokenEntries = Array.isArray(value)
      ? value.map((entry) => [null, entry])
      : Object.entries(value);

    const sanitizedForMap = {};

    tokenEntries.forEach(([rawKey, rawValue]) => {
      if (!rawValue || typeof rawValue !== 'object') {
        didMutate = true;
        return;
      }

      const candidate = { ...rawValue };
      let characterId =
        typeof candidate.characterId === 'string' && candidate.characterId.trim() !== ''
          ? candidate.characterId.trim()
          : null;

      if (!characterId && typeof rawKey === 'string' && rawKey.trim() !== '') {
        characterId = rawKey.trim();
        didMutate = true;
      }

      if (!characterId) {
        didMutate = true;
        return;
      }

      const clampedX = clampPercentage(candidate.x);
      const clampedY = clampPercentage(candidate.y);

      if (clampedX === null || clampedY === null) {
        didMutate = true;
        return;
      }

      if (clampedX !== candidate.x || clampedY !== candidate.y) {
        didMutate = true;
      }

      const updatedAt = toIsoDate(candidate.updatedAt, null);
      const resolvedUpdatedAt = updatedAt || timestamp;
      if (!updatedAt || updatedAt !== candidate.updatedAt) {
        didMutate = true;
      }

      const sanitizedToken = {
        characterId,
        x: clampedX,
        y: clampedY,
        updatedAt: resolvedUpdatedAt,
      };

      const originalComparable = JSON.stringify({
        characterId: rawValue.characterId,
        x: rawValue.x,
        y: rawValue.y,
        updatedAt: rawValue.updatedAt,
      });
      const sanitizedComparable = JSON.stringify(sanitizedToken);
      if (originalComparable !== sanitizedComparable) {
        didMutate = true;
      }

      sanitizedForMap[characterId] = sanitizedToken;
    });

    if (Object.keys(sanitizedForMap).length > 0) {
      normalizedTokens[mapId] = sanitizedForMap;
    } else if (
      (Array.isArray(value) && value.length > 0) ||
      (!Array.isArray(value) && Object.keys(value).length > 0)
    ) {
      didMutate = true;
    }
  });

  return { tokensByMapId: normalizedTokens, didMutate };
};

const buildCampaignMapPayload = (maps, activeMapId, mapTokens = {}) => {
  const sorted = sortMaps(Array.isArray(maps) ? maps : []);
  let resolvedActiveId =
    typeof activeMapId === 'string' && activeMapId.trim() !== ''
      ? activeMapId.trim()
      : null;

  if (resolvedActiveId) {
    const hasActive = sorted.some((map) => map.mapId === resolvedActiveId);
    if (!hasActive) {
      resolvedActiveId = null;
    }
  }

  if (!resolvedActiveId && sorted.length > 0) {
    resolvedActiveId = sorted[0].mapId;
  }

  const validMapIds = new Set(sorted.map((map) => map.mapId));
  const { tokensByMapId } = normalizeMapTokens({
    mapTokens,
    validMapIds,
    now: new Date().toISOString(),
  });

  const activeMapTokens = resolvedActiveId
    ? tokensByMapId[resolvedActiveId] || {}
    : {};

  const activeMapBase = resolvedActiveId
    ? sorted.find((map) => map.mapId === resolvedActiveId) || null
    : null;
  const activeMap = activeMapBase
    ? { ...activeMapBase, tokens: activeMapTokens }
    : null;

  return {
    maps: sorted,
    activeMapId: activeMap ? activeMap.mapId : null,
    map: activeMap,
    tokensByMapId,
    activeMapTokens,
  };
};

const prepareStoredMap = ({
  mapInput,
  existingMap,
  prompt,
  keepUpdatedAt = false,
}) => {
  const schemas = getMapSchemas();
  const parsedInput = schemas.input.safeParse(mapInput);
  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error?.message || 'Invalid map data',
    };
  }

  const { summary: _summary, caption: _caption, ...base } = parsedInput.data;
  const now = new Date().toISOString();
  const existing = existingMap && typeof existingMap === 'object' ? existingMap : {};

  let mapId =
    typeof existing.mapId === 'string' && UUID_REGEX.test(existing.mapId)
      ? existing.mapId
      : null;
  if (!mapId) {
    mapId = generateStableId();
  }

  let createdAt = toIsoDate(existing.createdAt, null);
  if (!createdAt) {
    createdAt = toIsoDate(existing.updatedAt, now) || now;
  }

  let updatedAt = keepUpdatedAt
    ? toIsoDate(existing.updatedAt, now) || now
    : now;
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    createdAt = updatedAt;
  }

  const storedMap = {
    ...base,
    mapId,
    createdAt,
    updatedAt,
  };

  if (typeof storedMap.title === 'string') {
    const trimmedTitle = storedMap.title.trim();
    if (trimmedTitle) {
      storedMap.title = trimmedTitle;
    } else {
      delete storedMap.title;
    }
  }

  if (
    !storedMap.title &&
    typeof existing.title === 'string' &&
    existing.title.trim() !== ''
  ) {
    storedMap.title = existing.title.trim();
  }

  if (typeof storedMap.cloudinaryPublicId === 'string') {
    const trimmedId = storedMap.cloudinaryPublicId.trim();
    if (trimmedId) {
      storedMap.cloudinaryPublicId = trimmedId;
    } else {
      delete storedMap.cloudinaryPublicId;
    }
  }

  if (
    storedMap.cloudinaryPublicId === undefined &&
    typeof existing.cloudinaryPublicId === 'string' &&
    existing.cloudinaryPublicId.trim() !== ''
  ) {
    storedMap.cloudinaryPublicId = existing.cloudinaryPublicId.trim();
  }

  if (typeof prompt === 'string' && prompt.trim() !== '') {
    storedMap.originalPrompt = prompt.trim();
  } else if (
    typeof existing.originalPrompt === 'string' &&
    existing.originalPrompt.trim() !== ''
  ) {
    storedMap.originalPrompt = existing.originalPrompt.trim();
  }

  const parsedStored = schemas.stored.safeParse(storedMap);
  if (!parsedStored.success) {
    return {
      success: false,
      error: parsedStored.error?.message || 'Invalid map data',
    };
  }

  return { success: true, data: parsedStored.data };
};

const normalizeCampaignMapState = async ({ campaign, collection }) => {
  if (!campaign || typeof campaign !== 'object') {
    return {
      campaign: null,
      payload: {
        maps: [],
        activeMapId: null,
        map: null,
        tokensByMapId: {},
        activeMapTokens: {},
      },
      updated: false,
    };
  }

  const schemas = getMapSchemas();
  const now = new Date().toISOString();
  const normalizedMaps = [];
  let didMutate = false;

  if (Array.isArray(campaign.maps)) {
    campaign.maps.forEach((mapEntry) => {
      if (!mapEntry || typeof mapEntry !== 'object') {
        didMutate = true;
        return;
      }

      const candidate = { ...mapEntry };
      if (!UUID_REGEX.test(candidate.mapId || '')) {
        candidate.mapId = generateStableId();
        didMutate = true;
      }

      candidate.createdAt = toIsoDate(candidate.createdAt, null);
      if (!candidate.createdAt) {
        candidate.createdAt = toIsoDate(candidate.updatedAt, now) || now;
        didMutate = true;
      }

      candidate.updatedAt = toIsoDate(candidate.updatedAt, candidate.createdAt);
      if (!candidate.updatedAt) {
        candidate.updatedAt = candidate.createdAt;
        didMutate = true;
      }

      const parsed = schemas.stored.safeParse(candidate);
      if (!parsed.success) {
        didMutate = true;
        return;
      }

      const sanitized = parsed.data;
      if (!didMutate) {
        const originalString = JSON.stringify(mapEntry);
        const sanitizedString = JSON.stringify(sanitized);
        if (originalString !== sanitizedString) {
          didMutate = true;
        }
      }

      normalizedMaps.push(sanitized);
    });
  }

  if (normalizedMaps.length === 0) {
    const legacyMap = campaign.map && typeof campaign.map === 'object' ? campaign.map : null;
    if (legacyMap) {
      const prepared = prepareStoredMap({
        mapInput: legacyMap,
        existingMap: legacyMap,
        prompt: legacyMap.originalPrompt,
        keepUpdatedAt: true,
      });
      if (prepared.success) {
        normalizedMaps.push(prepared.data);
        didMutate = true;
      }
    }
  }

  const validMapIds = new Set(normalizedMaps.map((map) => map.mapId));
  const { tokensByMapId: normalizedTokens, didMutate: tokensMutated } =
    normalizeMapTokens({
      mapTokens: campaign.mapTokens,
      validMapIds,
      now,
    });

  if (tokensMutated) {
    didMutate = true;
  }

  const payload = buildCampaignMapPayload(
    normalizedMaps,
    campaign.activeMapId,
    normalizedTokens
  );

  const existingMapString = JSON.stringify(campaign.map ?? null);
  const payloadMapString = JSON.stringify(payload.map ?? null);
  const existingMapsString = JSON.stringify(campaign.maps ?? []);
  const payloadMapsString = JSON.stringify(payload.maps);
  const existingTokensString = JSON.stringify(campaign.mapTokens ?? {});
  const payloadTokensString = JSON.stringify(payload.tokensByMapId);

  const shouldUpdate =
    didMutate ||
    campaign.activeMapId !== payload.activeMapId ||
    existingMapString !== payloadMapString ||
    existingMapsString !== payloadMapsString ||
    existingTokensString !== payloadTokensString;

  if (shouldUpdate && collection) {
    await collection.updateOne(
      { campaignName: campaign.campaignName },
      {
        $set: {
          maps: payload.maps,
          activeMapId: payload.activeMapId,
          map: payload.map || null,
          mapTokens: payload.tokensByMapId,
        },
      }
    );
  }

  const normalizedCampaign = {
    ...campaign,
    maps: payload.maps,
    activeMapId: payload.activeMapId,
    map: payload.map || null,
    mapTokens: payload.tokensByMapId,
  };

  return { campaign: normalizedCampaign, payload, updated: shouldUpdate };
};

module.exports = {
  buildCampaignMapPayload,
  prepareStoredMap,
  normalizeCampaignMapState,
  getMapSchemas,
  normalizeMapTokens,
};
