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

const buildCampaignMapPayload = (maps, activeMapId) => {
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

  const activeMap = resolvedActiveId
    ? sorted.find((map) => map.mapId === resolvedActiveId) || null
    : null;

  return {
    maps: sorted,
    activeMapId: activeMap ? activeMap.mapId : null,
    map: activeMap || null,
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

  const base = parsedInput.data;
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
      payload: { maps: [], activeMapId: null, map: null },
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

  const payload = buildCampaignMapPayload(normalizedMaps, campaign.activeMapId);

  const existingMapString = JSON.stringify(campaign.map ?? null);
  const payloadMapString = JSON.stringify(payload.map ?? null);
  const existingMapsString = JSON.stringify(campaign.maps ?? []);
  const payloadMapsString = JSON.stringify(payload.maps);

  const shouldUpdate =
    didMutate ||
    campaign.activeMapId !== payload.activeMapId ||
    existingMapString !== payloadMapString ||
    existingMapsString !== payloadMapsString;

  if (shouldUpdate && collection) {
    await collection.updateOne(
      { campaignName: campaign.campaignName },
      {
        $set: {
          maps: payload.maps,
          activeMapId: payload.activeMapId,
          map: payload.map || null,
        },
      }
    );
  }

  const normalizedCampaign = {
    ...campaign,
    maps: payload.maps,
    activeMapId: payload.activeMapId,
    map: payload.map || null,
  };

  return { campaign: normalizedCampaign, payload, updated: shouldUpdate };
};

module.exports = {
  buildCampaignMapPayload,
  prepareStoredMap,
  normalizeCampaignMapState,
  getMapSchemas,
};
