import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import CampaignMapBoard from './CampaignMapBoard';
import { groupMapsByFolder, UNGROUPED_FOLDER_KEY } from '../utils/mapGrouping';
import { resolveFigurineImageData } from '../utils/figurineAssets';
import resolveMapImageSource from '../utils/mapImages';
import DockControls from '../components/DockControls';

const clamp01 = (value) => {
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

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeToken = (tokenValue, fallbackId) => {
  if (!tokenValue || typeof tokenValue !== 'object') {
    return null;
  }

  const candidate = { ...tokenValue };
  const candidateId =
    (typeof candidate.characterId === 'string' && candidate.characterId.trim()) ||
    (typeof fallbackId === 'string' && fallbackId.trim()) ||
    null;

  if (!candidateId) {
    return null;
  }

  const x = clamp01(candidate.x);
  const y = clamp01(candidate.y);

  if (x === null || y === null) {
    return null;
  }

  return { ...candidate, characterId: candidateId, x, y };
};

const sanitizeTokenDictionary = (tokens) => {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  if (Array.isArray(tokens)) {
    return tokens.reduce((acc, token) => {
      const sanitized = sanitizeToken(token);
      if (sanitized) {
        acc[sanitized.characterId] = sanitized;
      }
      return acc;
    }, {});
  }

  return Object.entries(tokens).reduce((acc, [key, value]) => {
    const sanitized = sanitizeToken(value, key);
    if (sanitized) {
      acc[sanitized.characterId] = sanitized;
    }
    return acc;
  }, {});
};

const MAP_IDENTIFIER_KEYS = [
  'mapId',
  'map_id',
  'mapID',
  'MapId',
  'MapID',
  'MAPID',
  'MAP_ID',
  '_id',
  'id',
  'Id',
  'ID',
  'uuid',
  'UUID',
  'guid',
  'GUID',
  'slug',
  'Slug',
  'identifier',
  'Identifier',
  'IDENTIFIER',
];
const MAP_IDENTIFIER_FALLBACK_KEYS = [
  '$oid',
  '$id',
  '$uuid',
  '$guid',
  'hex',
  'hexString',
  'value',
  'string',
  'idStr',
];
const NORMALIZED_IDENTIFIER_KEY_VALUES = new Set([
  'mapid',
  'id',
  'uuid',
  'guid',
  'slug',
  'identifier',
]);
const NORMALIZED_FALLBACK_IDENTIFIER_KEY_VALUES = new Set([
  'oid',
  'id',
  'uuid',
  'guid',
  'hex',
  'hexstring',
  'value',
  'string',
  'idstr',
]);

const normalizeIdentifierKey = (key) => {
  if (typeof key !== 'string') {
    return '';
  }

  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

const normalizeMapId = (value, visited = new Set()) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '[object Object]') {
      return null;
    }

    const wrappedMatch = trimmed.match(/^(?:new\s+)?(?:ObjectId|UUID|Guid)\((.*)\)$/i);
    if (wrappedMatch) {
      const inner = wrappedMatch[1].replace(/^['"]|['"]$/g, '').trim();
      if (inner) {
        return inner;
      }
    }

    const prefixMatch = trimmed.match(
      /^(?:characters?|character|pcs?|pc|npcs?|npc|tokens?|token|figurines?|figurine|miniatures?|miniature)[\s:._#\/\\]+(.+)$/i
    );
    if (prefixMatch) {
      const remainder = prefixMatch[1].trim();
      if (remainder) {
        const normalizedRemainder = normalizeMapId(remainder, visited);
        if (normalizedRemainder) {
          return normalizedRemainder;
        }
      }
    }

    if (trimmed.includes('/') || trimmed.includes('\\')) {
      const segments = trimmed.split(/[\/\\]+/).filter(Boolean);
      if (segments.length > 1) {
        const lastSegment = segments[segments.length - 1].trim();
        if (lastSegment && lastSegment !== trimmed) {
          const normalizedSegment = normalizeMapId(lastSegment, visited);
          if (normalizedSegment) {
            return normalizedSegment;
          }
        }
      }
    }

    return trimmed;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }

  if (typeof value === 'bigint') {
    return `${value}`;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeMapId(entry, visited);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    if (visited.has(value)) {
      return null;
    }

    visited.add(value);

    if (typeof value.toString === 'function') {
      try {
        const stringValue = value.toString();
        if (typeof stringValue === 'string') {
          const normalized = normalizeMapId(stringValue, visited);
          if (normalized && normalized !== '[object Object]') {
            return normalized;
          }
        }
      } catch (error) {
        // Ignore toString errors and continue inspecting properties.
      }
    }

    const keysToInspect = Array.from(
      new Set([...MAP_IDENTIFIER_KEYS, ...MAP_IDENTIFIER_FALLBACK_KEYS])
    );
    for (const key of keysToInspect) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const normalized = normalizeMapId(value[key], visited);
        if (normalized) {
          return normalized;
        }
      }
    }

    for (const [candidateKey, candidateValue] of Object.entries(value)) {
      const normalizedKey = normalizeIdentifierKey(candidateKey);
      if (
        NORMALIZED_IDENTIFIER_KEY_VALUES.has(normalizedKey) ||
        NORMALIZED_FALLBACK_IDENTIFIER_KEY_VALUES.has(normalizedKey)
      ) {
        const normalized = normalizeMapId(candidateValue, visited);
        if (normalized) {
          return normalized;
        }
      }
    }

    for (const entry of Object.values(value)) {
      const normalized = normalizeMapId(entry, visited);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
};

const CHARACTER_IDENTIFIER_KEYS = [
  'characterId',
  'character_id',
  'characterID',
  'CharacterId',
  'CharacterID',
  'CHARACTERID',
  'playerCharacterId',
  'playerCharacterID',
  'player_character_id',
  'player_characterID',
  'playerId',
  'playerID',
  'player_id',
  'PlayerId',
  'PlayerID',
  'profileId',
  'profileID',
  'profile_id',
  'ProfileId',
  'ProfileID',
  'id',
  'Id',
  'ID',
  '_id',
  'uuid',
  'UUID',
  'guid',
  'GUID',
  'slug',
  'Slug',
  'identifier',
  'Identifier',
  'IDENTIFIER',
];
const CHARACTER_IDENTIFIER_FALLBACK_KEYS = [
  '$oid',
  '$id',
  '$uuid',
  '$guid',
  'hex',
  'hexString',
  'value',
  'string',
  'idStr',
];
const NORMALIZED_CHARACTER_IDENTIFIER_KEY_VALUES = new Set(
  CHARACTER_IDENTIFIER_KEYS.map((key) => normalizeIdentifierKey(key))
);
const NORMALIZED_CHARACTER_FALLBACK_IDENTIFIER_KEY_VALUES = new Set(
  CHARACTER_IDENTIFIER_FALLBACK_KEYS.map((key) => normalizeIdentifierKey(key))
);

const collectCharacterIdentifiers = (value, fallbackIds = [], visited = new Set()) => {
  const identifiers = new Set();

  const addIdentifier = (candidate) => {
    const normalized = normalizeMapId(candidate, visited);
    if (normalized) {
      identifiers.add(normalized);
    }
  };

  fallbackIds.forEach(addIdentifier);

  const inspect = (input) => {
    if (input === null || input === undefined) {
      return;
    }

    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'bigint') {
      addIdentifier(input);
      return;
    }

    if (typeof input !== 'object') {
      return;
    }

    if (visited.has(input)) {
      return;
    }

    visited.add(input);

    if (typeof input.toString === 'function') {
      try {
        const stringValue = input.toString();
        if (typeof stringValue === 'string' && stringValue.trim() !== '') {
          addIdentifier(stringValue);
        }
      } catch (error) {
        // Ignore toString errors and continue inspecting properties.
      }
    }

    CHARACTER_IDENTIFIER_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        inspect(input[key]);
      }
    });

    Object.entries(input).forEach(([candidateKey, candidateValue]) => {
      const normalizedKey = normalizeIdentifierKey(candidateKey);
      if (
        NORMALIZED_CHARACTER_IDENTIFIER_KEY_VALUES.has(normalizedKey) ||
        NORMALIZED_CHARACTER_FALLBACK_IDENTIFIER_KEY_VALUES.has(normalizedKey)
      ) {
        inspect(candidateValue);
      }
    });

    Object.values(input).forEach((entry) => {
      inspect(entry);
    });
  };

  inspect(value);

  return Array.from(identifiers);
};

const collectMapIdentifiers = (map, fallbackIds = []) => {
  const identifiers = new Set();

  const addIdentifier = (candidate) => {
    const normalized = normalizeMapId(candidate);
    if (normalized) {
      identifiers.add(normalized);
    }
  };

  if (map && typeof map === 'object') {
    MAP_IDENTIFIER_KEYS.forEach((key) => addIdentifier(map[key]));

    const relatedMetadata = [map.meta, map.metadata, map.details, map.settings];
    relatedMetadata.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      MAP_IDENTIFIER_KEYS.forEach((key) => addIdentifier(entry[key]));
    });
  }

  fallbackIds.forEach(addIdentifier);

  return Array.from(identifiers);
};

const normalizeMaps = (maps) =>
  Array.isArray(maps)
    ? maps.filter((map) => map && typeof map === 'object')
    : [];

const resolveMapTitle = (map, index) => {
  if (!map || typeof map !== 'object') {
    return `Map ${index + 1}`;
  }

  const { title } = map;
  if (typeof title === 'string' && title.trim() !== '') {
    return title.trim();
  }

  return `Map ${index + 1}`;
};

const findMapById = (maps, id) => {
  const normalizedId = normalizeMapId(id);
  if (!normalizedId) {
    return null;
  }

  return maps.find((map) => normalizeMapId(map?.mapId) === normalizedId) || null;
};

const areSetsEqual = (a, b) => {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.size !== b.size) {
    return false;
  }

  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }

  return true;
};

const MapModal = ({
  show,
  onHide,
  map,
  maps,
  activeMapId,
  selectedMapId,
  onSelectMap,
  onActivateMap,
  onDeleteMap,
  isLoading,
  actionInProgressId,
  emptyMessage,
  title,
  tokensByMapId,
  currentCharacterId,
  activeCharacterId,
  characterLookup,
  onTokenMove,
  onTokenRemove,
  readOnly,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
  displayMode = 'modal',
}) => {
  const isBackground = displayMode === 'background';
  const backgroundBoardContainerRef = useRef(null);
  const normalizedMaps = useMemo(
    () => (isBackground ? [] : normalizeMaps(maps)),
    [isBackground, maps]
  );
  const normalizedTokensByMapId = useMemo(() => {
    if (!tokensByMapId || typeof tokensByMapId !== 'object') {
      return {};
    }

    return Object.entries(tokensByMapId).reduce((acc, [key, value]) => {
      if (!value || typeof value !== 'object') {
        return acc;
      }

      const normalizedKey = normalizeMapId(key);
      if (!normalizedKey) {
        return acc;
      }

      acc[normalizedKey] = value;
      return acc;
    }, {});
  }, [tokensByMapId]);
  const tokenMapIdCandidates = useMemo(
    () => Object.keys(normalizedTokensByMapId),
    [normalizedTokensByMapId]
  );
  const normalizedActiveId = useMemo(() => normalizeMapId(activeMapId), [activeMapId]);
  const normalizedActionId = useMemo(
    () => normalizeMapId(actionInProgressId),
    [actionInProgressId]
  );
  const isSelectControlled = typeof onSelectMap === 'function';
  const normalizedSelectedId = useMemo(
    () => (isSelectControlled ? normalizeMapId(selectedMapId) : null),
    [isSelectControlled, selectedMapId]
  );

  const resolvedSelectedId = useMemo(() => {
    if (normalizedSelectedId && findMapById(normalizedMaps, normalizedSelectedId)) {
      return normalizedSelectedId;
    }

    if (normalizedActiveId && findMapById(normalizedMaps, normalizedActiveId)) {
      return normalizedActiveId;
    }

    const firstWithId = normalizedMaps.find((item) => normalizeMapId(item?.mapId));
    return firstWithId ? normalizeMapId(firstWithId.mapId) : null;
  }, [normalizedMaps, normalizedSelectedId, normalizedActiveId]);

  const previewMap = useMemo(() => {
    if (isBackground) {
      return map || null;
    }

    if (normalizedMaps.length > 0) {
      const selectedFromList = findMapById(normalizedMaps, resolvedSelectedId);
      if (selectedFromList) {
        return selectedFromList;
      }

      if (normalizedActiveId) {
        const activeMap = findMapById(normalizedMaps, normalizedActiveId);
        if (activeMap) {
          return activeMap;
        }
      }

      return normalizedMaps[0];
    }

    return map || null;
  }, [
    isBackground,
    map,
    normalizedMaps,
    resolvedSelectedId,
    normalizedActiveId,
  ]);

  const backgroundImageSrc = useMemo(
    () => resolveMapImageSource(previewMap),
    [previewMap]
  );

  const backgroundStyle = useMemo(() => {
    if (!backgroundImageSrc) {
      return undefined;
    }

    return {
      backgroundImage: `url("${backgroundImageSrc}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }, [backgroundImageSrc]);

  const previewMapIdCandidates = useMemo(() => {
    const fallbackIdentifiers = [];

    if (normalizedActiveId) {
      fallbackIdentifiers.push(normalizedActiveId);
    }

    fallbackIdentifiers.push(...tokenMapIdCandidates);

    const candidates = collectMapIdentifiers(previewMap, fallbackIdentifiers);

    if (normalizedSelectedId) {
      candidates.unshift(normalizedSelectedId);
    }

    tokenMapIdCandidates.forEach((identifier) => {
      if (!candidates.includes(identifier)) {
        candidates.push(identifier);
      }
    });

    return candidates.filter((value, index, array) => array.indexOf(value) === index);
  }, [normalizedActiveId, normalizedSelectedId, previewMap, tokenMapIdCandidates]);

  const previewMapId = useMemo(() => previewMapIdCandidates[0] || null, [previewMapIdCandidates]);

  const placementMapId = useMemo(() => {
    if (previewMapId) {
      return previewMapId;
    }

    if (normalizedActiveId) {
      return normalizedActiveId;
    }

    if (normalizedSelectedId) {
      return normalizedSelectedId;
    }

    return tokenMapIdCandidates[0] || null;
  }, [
    normalizedActiveId,
    normalizedSelectedId,
    previewMapId,
    tokenMapIdCandidates,
  ]);

  const resolvedPlacementMapId = useMemo(() => {
    if (placementMapId) {
      return placementMapId;
    }

    const directMapIdentifier = normalizeMapId(previewMap?.mapId);
    if (directMapIdentifier) {
      return directMapIdentifier;
    }

    const fallbackPreviewId = normalizeMapId(previewMap?.id ?? previewMap?._id);
    if (fallbackPreviewId) {
      return fallbackPreviewId;
    }

    if (normalizedSelectedId) {
      return normalizedSelectedId;
    }

    if (normalizedActiveId) {
      return normalizedActiveId;
    }

    return tokenMapIdCandidates[0] || null;
  }, [
    placementMapId,
    previewMap,
    normalizedSelectedId,
    normalizedActiveId,
    tokenMapIdCandidates,
  ]);

  const groupedMaps = useMemo(
    () => groupMapsByFolder(normalizedMaps),
    [normalizedMaps]
  );

  const [backgroundImageMetrics, setBackgroundImageMetrics] = useState({ width: null, height: null });
  const [backgroundContainerSize, setBackgroundContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!backgroundImageSrc) {
      setBackgroundImageMetrics({ width: null, height: null });
      return;
    }

    let isCancelled = false;
    const image = new Image();

    const handleLoad = () => {
      if (isCancelled) {
        return;
      }

      const { naturalWidth, naturalHeight } = image;

      if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight)) {
        setBackgroundImageMetrics({ width: null, height: null });
        return;
      }

      const nextWidth = Math.round(naturalWidth);
      const nextHeight = Math.round(naturalHeight);

      setBackgroundImageMetrics((previous) => {
        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return { width: nextWidth, height: nextHeight };
      });
    };

    const handleError = () => {
      if (isCancelled) {
        return;
      }

      setBackgroundImageMetrics({ width: null, height: null });
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);
    image.src = backgroundImageSrc;

    if (image.complete && image.naturalWidth && image.naturalHeight) {
      handleLoad();
    }

    return () => {
      isCancelled = true;
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
  }, [backgroundImageSrc]);

  useEffect(() => {
    if (!isBackground) {
      return;
    }

    const container = backgroundBoardContainerRef.current;

    if (!container || typeof container.getBoundingClientRect !== 'function') {
      return;
    }

    let frameHandle = null;

    const readSize = () => {
      frameHandle = null;

      const rect = container.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return;
      }

      setBackgroundContainerSize((previous) => {
        if (previous.width === width && previous.height === height) {
          return previous;
        }

        return { width, height };
      });
    };

    const scheduleRead = () => {
      if (frameHandle !== null) {
        return;
      }

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        frameHandle = window.requestAnimationFrame(readSize);
      } else {
        frameHandle = setTimeout(readSize, 16);
      }
    };

    scheduleRead();

    let resizeObserver = null;

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(scheduleRead);
      resizeObserver.observe(container);
    } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', scheduleRead);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', scheduleRead);
      }

      if (frameHandle !== null) {
        if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(frameHandle);
        } else {
          clearTimeout(frameHandle);
        }
      }
    };
  }, [isBackground, show, previewMapId]);

  useEffect(() => {
    if (!isBackground) {
      setBackgroundContainerSize({ width: 0, height: 0 });
    }
  }, [isBackground]);

  const backgroundBoardDimensions = useMemo(() => {
    const { width: imageWidth, height: imageHeight } = backgroundImageMetrics;
    const { width: containerWidth, height: containerHeight } = backgroundContainerSize;

    if (
      !Number.isFinite(imageWidth) ||
      !Number.isFinite(imageHeight) ||
      imageWidth <= 0 ||
      imageHeight <= 0 ||
      !Number.isFinite(containerWidth) ||
      !Number.isFinite(containerHeight) ||
      containerWidth <= 0 ||
      containerHeight <= 0
    ) {
      return null;
    }

    const scaleFactor = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);

    if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) {
      return null;
    }

    const width = imageWidth * scaleFactor;
    const height = imageHeight * scaleFactor;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { width, height };
  }, [backgroundContainerSize.height, backgroundContainerSize.width, backgroundImageMetrics.height, backgroundImageMetrics.width]);

  const autoExpandedFolderKeys = useMemo(() => {
    const keys = new Set();

    groupedMaps.forEach((group) => {
      const shouldExpand = group.maps.some((mapItem) => {
        const mapId = normalizeMapId(mapItem?.mapId);
        if (!mapId) {
          return false;
        }

        if (normalizedActiveId && normalizedActiveId === mapId) {
          return true;
        }

        if (resolvedSelectedId && resolvedSelectedId === mapId) {
          return true;
        }

        return false;
      });

      if (shouldExpand) {
        keys.add(group.key);
      }
    });

    return keys;
  }, [groupedMaps, normalizedActiveId, resolvedSelectedId]);

  const [expandedFolderKeys, setExpandedFolderKeys] = useState(
    () => new Set(autoExpandedFolderKeys)
  );

  useEffect(() => {
    setExpandedFolderKeys((previousKeys) => {
      const validKeys = new Set(groupedMaps.map((group) => group.key));
      const nextKeys = new Set();

      previousKeys.forEach((key) => {
        if (validKeys.has(key)) {
          nextKeys.add(key);
        }
      });

      autoExpandedFolderKeys.forEach((key) => {
        nextKeys.add(key);
      });

      if (areSetsEqual(previousKeys, nextKeys)) {
        return previousKeys;
      }

      return nextKeys;
    });
  }, [groupedMaps, autoExpandedFolderKeys]);

  const handleToggleFolder = useCallback((folderKey) => {
    setExpandedFolderKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      if (nextKeys.has(folderKey)) {
        nextKeys.delete(folderKey);
      } else {
        nextKeys.add(folderKey);
      }

      return nextKeys;
    });
  }, []);

  const normalizedCurrentCharacterId = useMemo(
    () => normalizeMapId(currentCharacterId),
    [currentCharacterId]
  );

  const normalizedActiveCharacterId = useMemo(
    () => normalizeMapId(activeCharacterId),
    [activeCharacterId]
  );

  const currentCharacterIdCandidatesLower = useMemo(() => {
    const candidates = new Set();

    const addCandidate = (candidate) => {
      const normalized = normalizeMapId(candidate);
      if (normalized) {
        candidates.add(normalized.toLowerCase());
      }
    };

    addCandidate(normalizedCurrentCharacterId);
    addCandidate(normalizedActiveCharacterId);

    const initialCandidates = new Set(candidates);

    if (characterLookup && typeof characterLookup === 'object') {
      Object.entries(characterLookup).forEach(([key, value]) => {
        const identifiers = collectCharacterIdentifiers(value, [key]);
        const identifierLowers = identifiers
          .map((identifier) => identifier.toLowerCase())
          .filter(Boolean);

        const hasOverlap = identifierLowers.some((identifier) =>
          initialCandidates.has(identifier)
        );

        if (hasOverlap) {
          identifierLowers.forEach((identifier) => {
            candidates.add(identifier);
          });
        }
      });
    }

    return candidates;
  }, [characterLookup, normalizedActiveCharacterId, normalizedCurrentCharacterId]);

  const normalizedCharacterLookup = useMemo(() => {
    if (!characterLookup || typeof characterLookup !== 'object') {
      return {};
    }

    return Object.entries(characterLookup).reduce((acc, [key, value]) => {
      if (typeof key !== 'string') {
        return acc;
      }

      const trimmedKey = key.trim();
      if (!trimmedKey) {
        return acc;
      }

      const color =
        typeof value?.color === 'string' && value.color.trim() !== ''
          ? value.color.trim()
          : null;
      const label =
        typeof value?.label === 'string' && value.label.trim() !== ''
          ? value.label.trim()
          : null;
      const currentHp = toFiniteNumberOrNull(value?.currentHp);
      const maxHp = toFiniteNumberOrNull(value?.maxHp);
      const entityType =
        typeof value?.entityType === 'string' && value.entityType.trim() !== ''
          ? value.entityType.trim().toLowerCase()
          : null;
      const variant =
        typeof value?.variant === 'string' && value.variant.trim() !== ''
          ? value.variant.trim().toLowerCase()
          : null;
      const size =
        typeof value?.size === 'string' && value.size.trim() !== ''
          ? value.size.trim().toLowerCase()
          : null;
      const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(value);

      acc[trimmedKey] = {
        color,
        label,
        ...(entityType ? { entityType } : {}),
        ...(variant ? { variant } : {}),
        ...(currentHp !== null ? { currentHp } : {}),
        ...(maxHp !== null ? { maxHp } : {}),
        ...(size ? { size } : {}),
        ...(figurineImageUrl ? { figurineImageUrl } : {}),
        ...(figurineImagePublicId ? { figurineImagePublicId } : {}),
      };
      return acc;
    }, {});
  }, [characterLookup]);

  const tokensDictionary = useMemo(() => {
    if (tokensByMapId && typeof tokensByMapId === 'object') {
      for (const candidate of previewMapIdCandidates) {
        if (!candidate) {
          continue;
        }

        const normalizedCandidate = normalizeMapId(candidate);
        const entry =
          tokensByMapId[candidate] ||
          (normalizedCandidate ? normalizedTokensByMapId[normalizedCandidate] : null);
        if (entry && typeof entry === 'object') {
          return sanitizeTokenDictionary(entry);
        }
      }
    }

    if (previewMap && typeof previewMap === 'object' && previewMap.tokens) {
      return sanitizeTokenDictionary(previewMap.tokens);
    }

    if (tokenMapIdCandidates.length > 0) {
      const fallbackEntry = normalizedTokensByMapId[tokenMapIdCandidates[0]];
      if (fallbackEntry && typeof fallbackEntry === 'object') {
        return sanitizeTokenDictionary(fallbackEntry);
      }
    }

    return {};
  }, [
    normalizedTokensByMapId,
    previewMap,
    previewMapIdCandidates,
    tokenMapIdCandidates,
    tokensByMapId,
  ]);

  const [placementPending, setPlacementPending] = useState(false);
  const [placementError, setPlacementError] = useState(null);
  useEffect(() => {
    if (!show) {
      setPlacementPending(false);
      setPlacementError(null);
    }
  }, [show]);

  useEffect(() => {
    setPlacementError(null);
    setPlacementPending(false);
  }, [resolvedPlacementMapId, currentCharacterId]);

  const hasInteractiveBoard = useMemo(() => Boolean(previewMap), [previewMap]);
  const canManipulateTokens = useMemo(
    () => hasInteractiveBoard && typeof onTokenMove === 'function',
    [hasInteractiveBoard, onTokenMove]
  );
  const canHandleTokenRemoval = useMemo(
    () => hasInteractiveBoard && typeof onTokenRemove === 'function',
    [hasInteractiveBoard, onTokenRemove]
  );

  const backgroundClassName = useMemo(() => {
    const classes = ['map-modal-background'];

    if (backgroundImageSrc) {
      classes.push('map-modal-background--has-image');
    }

    if (hasInteractiveBoard) {
      classes.push('map-modal-background--interactive');
    }

    return classes.join(' ');
  }, [backgroundImageSrc, hasInteractiveBoard]);

  const boardTokens = useMemo(() => {
    const tokensList = Object.values(tokensDictionary);

    return tokensList
      .map((token) => {
        const lookup = normalizedCharacterLookup[token.characterId] || {};
        const rawLabel =
          lookup.label ||
          (typeof token.label === 'string' && token.label.trim() !== '' ? token.label.trim() : null) ||
          token.characterId;

        const currentHp = toFiniteNumberOrNull(
          lookup.currentHp ?? token.currentHp ?? token.hpCurrent ?? token.health
        );
        const maxHp = toFiniteNumberOrNull(
          lookup.maxHp ?? token.maxHp ?? token.hpMax ?? token.health
        );

        const tokenIdentifier =
          typeof token.characterId === 'string' && token.characterId.trim() !== ''
            ? token.characterId.trim()
            : null;
        const normalizedTokenIdentifier = normalizeMapId(tokenIdentifier);
        const normalizedTokenIdentifierLower = normalizedTokenIdentifier
          ? normalizedTokenIdentifier.toLowerCase()
          : null;

        const hasCharacterContext = Boolean(
          readOnly &&
            currentCharacterIdCandidatesLower &&
            currentCharacterIdCandidatesLower.size > 0
        );

        const matchesCurrentCharacter = Boolean(
          hasCharacterContext &&
            normalizedTokenIdentifierLower &&
            currentCharacterIdCandidatesLower.has(normalizedTokenIdentifierLower)
        );

        const canCurrentlyManipulate = canManipulateTokens && !placementPending;

        let isMovable =
          canCurrentlyManipulate && (!hasCharacterContext || matchesCurrentCharacter);

        if (token.isMovable === true) {
          isMovable = canCurrentlyManipulate;
        } else if (token.isMovable === false) {
          isMovable = false;
        }

        const lookupVariant =
          typeof lookup.variant === 'string' && lookup.variant.trim() !== ''
            ? lookup.variant.trim().toLowerCase()
            : null;
        const tokenVariant =
          typeof token.variant === 'string' && token.variant.trim() !== ''
            ? token.variant.trim().toLowerCase()
            : null;
        const lookupEntityType =
          typeof lookup.entityType === 'string' && lookup.entityType.trim() !== ''
            ? lookup.entityType.trim().toLowerCase()
            : null;
        const tokenEntityType =
          typeof token.entityType === 'string' && token.entityType.trim() !== ''
            ? token.entityType.trim().toLowerCase()
            : null;

        const entityType = lookupEntityType || tokenEntityType || null;

        const lookupSize =
          typeof lookup.size === 'string' && lookup.size.trim() !== ''
            ? lookup.size.trim().toLowerCase()
            : null;
        const tokenSize =
          typeof token.size === 'string' && token.size.trim() !== ''
            ? token.size.trim().toLowerCase()
            : null;
        const size = lookupSize || tokenSize || null;

        let variant = lookupVariant || tokenVariant || null;
        if (!variant && entityType) {
          if (entityType === 'enemy') {
            variant = 'enemy';
          } else if (entityType === 'character' && matchesCurrentCharacter) {
            variant = 'self';
          } else if (entityType === 'character' || entityType !== 'enemy') {
            variant = 'ally';
          }
        }

        const baseColor = lookup.color || token.color || null;
        const normalizedColor =
          typeof baseColor === 'string' && baseColor.trim() !== '' ? baseColor.trim() : null;

        const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(lookup, token);

        return {
          ...token,
          label: typeof rawLabel === 'string' ? rawLabel : token.characterId,
          color: normalizedColor,
          isMovable,
          isActiveTurn:
            Boolean(normalizedActiveCharacterId) &&
            token.characterId === normalizedActiveCharacterId,
          ...(entityType ? { entityType } : {}),
          ...(variant ? { variant } : {}),
          ...(currentHp !== null ? { currentHp } : {}),
          ...(maxHp !== null ? { maxHp } : {}),
          ...(size ? { size } : {}),
          ...(figurineImageUrl ? { figurineImageUrl } : {}),
          ...(figurineImagePublicId ? { figurineImagePublicId } : {}),
        };
      })
      .sort((a, b) => {
        const labelA = (a.label || a.characterId || '').toLowerCase();
        const labelB = (b.label || b.characterId || '').toLowerCase();
        return labelA.localeCompare(labelB);
      });
  }, [
    canManipulateTokens,
    currentCharacterIdCandidatesLower,
    normalizedCharacterLookup,
    normalizedActiveCharacterId,
    placementPending,
    readOnly,
    tokensDictionary,
  ]);

  const currentToken = useMemo(() => {
    if (!currentCharacterIdCandidatesLower || currentCharacterIdCandidatesLower.size === 0) {
      return null;
    }

    for (const [key, value] of Object.entries(tokensDictionary)) {
      if (!value || typeof value !== 'object') {
        continue;
      }

      const normalizedKey = normalizeMapId(key);
      if (normalizedKey && currentCharacterIdCandidatesLower.has(normalizedKey.toLowerCase())) {
        return value;
      }

      const normalizedValueId = normalizeMapId(value.characterId);
      if (
        normalizedValueId &&
        currentCharacterIdCandidatesLower.has(normalizedValueId.toLowerCase())
      ) {
        return value;
      }
    }

    return null;
  }, [currentCharacterIdCandidatesLower, tokensDictionary]);

  const handleCommitMove = useCallback(
    async ({ characterId, x, y, rotation }) => {
      if (!canManipulateTokens || placementPending) {
        return;
      }

      const normalizedCharacterId = normalizeMapId(characterId);
      if (!normalizedCharacterId) {
        return;
      }

      const normalizedCharacterIdLower = normalizedCharacterId.toLowerCase();

      if (readOnly && !currentCharacterIdCandidatesLower.has(normalizedCharacterIdLower)) {
        return;
      }

      setPlacementPending(true);
      setPlacementError(null);

      try {
        const payload = {
          characterId: normalizedCharacterId,
          x,
          y,
        };

        const payloadMapId = resolvedPlacementMapId;
        if (payloadMapId) {
          payload.mapId = payloadMapId;
        }

        if (Number.isFinite(rotation)) {
          payload.rotation = rotation;
        }

        if (typeof onTokenMove !== 'function') {
          return;
        }

        const result = await onTokenMove(payload);

        if (result === false) {
          setPlacementError('Unable to update figurine position.');
        }
      } catch (error) {
        const message =
          (error && typeof error.message === 'string' && error.message.trim()) ||
          'Failed to update figurine position.';
        setPlacementError(message);
      } finally {
        setPlacementPending(false);
      }
    },
    [
      currentCharacterIdCandidatesLower,
      canManipulateTokens,
      onTokenMove,
      placementPending,
      readOnly,
      resolvedPlacementMapId,
    ]
  );

  const handleTokenPositionChange = useCallback(
    ({ characterId, x, y, rotation }) => {
      if (!canManipulateTokens) {
        return;
      }

      handleCommitMove({ characterId, x, y, rotation });
    },
    [handleCommitMove, canManipulateTokens]
  );

  const handleBackgroundPlacement = useCallback(
    ({ x, y }) => {
      if (!canManipulateTokens || placementPending) {
        return;
      }

      if (!normalizedCurrentCharacterId || currentToken) {
        return;
      }

      handleCommitMove({ characterId: normalizedCurrentCharacterId, x, y });
    },
    [
      currentToken,
      handleCommitMove,
      canManipulateTokens,
      normalizedCurrentCharacterId,
      placementPending,
    ]
  );

  const backgroundBoardStyleValue = useMemo(() => {
    const style = {
      transform: 'translate(-50%, -50%)',
    };

    if (backgroundBoardDimensions) {
      style.width = `${backgroundBoardDimensions.width}px`;
      style.height = `${backgroundBoardDimensions.height}px`;
    }

    return style;
  }, [backgroundBoardDimensions]);

  const backgroundBoardClassName = 'map-modal-background__board-inner';

  const handleTokenRemove = useCallback(
    ({ characterId, token }) => {
      if (!canHandleTokenRemoval || placementPending) {
        return false;
      }

      if (typeof onTokenRemove !== 'function') {
        return false;
      }

      const normalizedCharacterId = normalizeMapId(characterId);
      if (!normalizedCharacterId) {
        return false;
      }

      const normalizedCharacterIdLower = normalizedCharacterId.toLowerCase();

      if (readOnly && !currentCharacterIdCandidatesLower.has(normalizedCharacterIdLower)) {
        return false;
      }

      const payload = {
        characterId: normalizedCharacterId,
      };

      if (resolvedPlacementMapId) {
        payload.mapId = resolvedPlacementMapId;
      }

      if (token) {
        payload.token = token;
      } else if (tokensDictionary[normalizedCharacterId]) {
        payload.token = tokensDictionary[normalizedCharacterId];
      } else {
        const aliasToken = Object.values(tokensDictionary).find((entry) => {
          const normalizedEntryId = normalizeMapId(entry?.characterId);
          return (
            normalizedEntryId &&
            currentCharacterIdCandidatesLower.has(normalizedEntryId.toLowerCase())
          );
        });

        if (aliasToken) {
          payload.token = aliasToken;
        }
      }

      if (typeof onTokenRemove !== 'function') {
        return false;
      }

      return onTokenRemove(payload);
    },
    [
      canHandleTokenRemoval,
      placementPending,
      onTokenRemove,
      resolvedPlacementMapId,
      readOnly,
      currentCharacterIdCandidatesLower,
      tokensDictionary,
    ]
  );

  const canClickToPlace = useMemo(
    () =>
      Boolean(
        canManipulateTokens &&
          !placementPending &&
          currentCharacterIdCandidatesLower &&
          currentCharacterIdCandidatesLower.size > 0 &&
          !currentToken
      ),
    [
      currentCharacterIdCandidatesLower,
      currentToken,
      canManipulateTokens,
      placementPending,
    ]
  );

  const handleSelectMap = useCallback(
    (mapId) => {
      if (typeof onSelectMap !== 'function') {
        return;
      }

      const normalizedId = normalizeMapId(mapId);
      onSelectMap(normalizedId);
    },
    [onSelectMap]
  );

  const handleActivateMap = useCallback(
    (event, mapId) => {
      event.stopPropagation();
      if (typeof onActivateMap !== 'function') {
        return;
      }

      const normalizedId = normalizeMapId(mapId);
      if (!normalizedId) {
        return;
      }

      onActivateMap(normalizedId);
    },
    [onActivateMap]
  );

  const handleDeleteMap = useCallback(
    (event, mapId) => {
      event.stopPropagation();
      if (typeof onDeleteMap !== 'function') {
        return;
      }

      const normalizedId = normalizeMapId(mapId);
      if (!normalizedId) {
        return;
      }

      onDeleteMap(normalizedId);
    },
    [onDeleteMap]
  );

  const hasManagementFeatures = useMemo(
    () =>
      typeof onSelectMap === 'function' ||
      typeof onActivateMap === 'function' ||
      typeof onDeleteMap === 'function',
    [onSelectMap, onActivateMap, onDeleteMap]
  );

  const renderMapList = () => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center py-4" data-testid="map-modal-loading">
          <Spinner animation="border" role="status" size="sm">
            <span className="visually-hidden">Loading maps…</span>
          </Spinner>
        </div>
      );
    }

    if (normalizedMaps.length === 0) {
      return (
        <div className="text-muted" data-testid="map-modal-empty">
          {emptyMessage}
        </div>
      );
    }

    const toFolderTestId = (groupKey, label) => {
      if (groupKey === UNGROUPED_FOLDER_KEY) {
        return 'map-modal-folder-no-folder';
      }

      const normalizedLabel = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `map-modal-folder-${normalizedLabel || 'no-folder'}`;
    };

    return (
      <ListGroup
        variant="flush"
        className="bg-transparent map-modal__list"
        data-testid="map-modal-list"
      >
        {groupedMaps.map((group) => {
          const headerTestId = toFolderTestId(group.key, group.label);
          const listBodyId = `${headerTestId}-body`;
          const toggleTestId = `${headerTestId}-toggle`;
          const isExpanded = expandedFolderKeys.has(group.key);

          return (
            <React.Fragment key={group.key}>
              <ListGroup.Item
                as="div"
                className="bg-secondary bg-opacity-50 text-light border-secondary"
                data-testid={headerTestId}
              >
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-decoration-none text-light d-flex align-items-center gap-2 p-0 flex-grow-1"
                    onClick={() => handleToggleFolder(group.key)}
                    aria-expanded={isExpanded}
                    aria-controls={listBodyId}
                    data-testid={toggleTestId}
                  >
                    <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                    <span className="fw-semibold text-uppercase small text-start">
                      {group.label}
                    </span>
                  </button>
                  <Badge bg="dark" pill>
                    {group.maps.length}
                  </Badge>
                </div>
              </ListGroup.Item>
              {isExpanded && (
                <div id={listBodyId}>
                  {group.maps.map((mapItem, index) => {
                    const mapId = normalizeMapId(mapItem?.mapId);
                    const key = mapId || `map-${group.key}-${index}`;
                    const isActive = Boolean(
                      normalizedActiveId &&
                      mapId &&
                      normalizedActiveId === mapId
                    );
                    const isSelected = Boolean(
                      resolvedSelectedId && mapId && resolvedSelectedId === mapId
                    );
                    const isProcessing = Boolean(
                      mapId && normalizedActionId && normalizedActionId === mapId
                    );
                    const titleText = resolveMapTitle(mapItem, index);
                    const canSelect =
                      typeof onSelectMap === 'function' && Boolean(mapId);
                    const canActivate = typeof onActivateMap === 'function';
                    const canDelete = typeof onDeleteMap === 'function';

                    return (
                      <ListGroup.Item
                        as="div"
                        key={key}
                        action={canSelect}
                        active={isSelected}
                        onClick={() => {
                          if (canSelect && mapId) {
                            handleSelectMap(mapId);
                          }
                        }}
                        className="bg-dark text-light border-secondary"
                        data-testid={`map-modal-item-${key}`}
                        data-folder={
                          group.key === UNGROUPED_FOLDER_KEY
                            ? undefined
                            : group.label
                        }
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="fw-semibold">{titleText}</div>
                          {isActive && (
                            <Badge
                              bg="success"
                              className="ms-2"
                              data-testid={`map-modal-active-badge-${key}`}
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        {(canActivate || canDelete) && (
                          <div className="d-flex flex-wrap gap-2 mt-3">
                            {canActivate && (
                              <Button
                                variant="outline-light"
                                size="sm"
                                disabled={!mapId || isProcessing || isActive}
                                onClick={(event) => handleActivateMap(event, mapId)}
                                data-testid={`map-modal-activate-${key}`}
                              >
                                {isActive ? 'Active' : 'Set Active'}
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                disabled={!mapId || isProcessing}
                                onClick={(event) => handleDeleteMap(event, mapId)}
                                data-testid={`map-modal-delete-${key}`}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        )}
                      </ListGroup.Item>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ListGroup>
    );
  };

  const renderPreviewContent = () => {
    if (!previewMap) {
      return <p className="text-muted mb-0">No map image available.</p>;
    }

    const isBoardDisabled = placementPending;

    return (
      <>
        <div className="map-modal__board-wrapper">
          <CampaignMapBoard
            map={previewMap}
            tokens={boardTokens}
            disabled={isBoardDisabled}
            onTokenPositionChange={
              canManipulateTokens ? handleTokenPositionChange : undefined
            }
            onBackgroundClick={
              canManipulateTokens ? handleBackgroundPlacement : undefined
            }
            onTokenRemove={
              canHandleTokenRemoval ? handleTokenRemove : undefined
            }
          />
          {canManipulateTokens && placementPending && (
            <div
              className="map-modal__saving-indicator d-flex align-items-center gap-2 text-muted small"
              data-testid="map-modal-placement-pending"
            >
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Saving figurine position…</span>
              </Spinner>
              <span>Saving figurine position…</span>
            </div>
          )}
        </div>
        {canManipulateTokens && canClickToPlace && (
          <div className="text-info small mt-3" data-testid="map-modal-placement-hint">
            Click the map to place your figurine.
          </div>
        )}
        {canManipulateTokens && placementError && (
          <Alert variant="danger" className="mt-3" data-testid="map-modal-placement-error">
            {placementError}
          </Alert>
        )}
      </>
    );
  };

  const dialogClassName = useMemo(() => {
    if (!isDocked || isBackground) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--map');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    if (isBackground) {
      return undefined;
    }

    const classes = ['dnd-modal', 'modern-modal'];

    if (isDocked) {
      classes.push('docked-modal-container');
    }

    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    onHide?.();
  }, [isDocked, onDockClose, onHide]);

  const titleContent = <>{title}</>;
  const backgroundAriaLabel = useMemo(() => {
    if (typeof title === 'string' && title.trim() !== '') {
      return title.trim();
    }

    return 'Campaign map';
  }, [title]);

  const emptyBoardMessage = hasManagementFeatures ? (
    <p className="text-muted mb-0">No map selected.</p>
  ) : (
    <p className="text-muted mb-0">No map image available.</p>
  );

  const boardContent = previewMap ? (
    renderPreviewContent()
  ) : (
    <div className="map-modal__empty" data-testid="map-modal-empty">
      {emptyBoardMessage}
    </div>
  );

  const bodyContent = hasManagementFeatures ? (
    <div className="d-flex flex-column flex-lg-row gap-4">
      <div className="flex-grow-1" data-testid="map-modal-sidebar">
        <h5 className="h6 mb-3">Saved Maps</h5>
        {renderMapList()}
      </div>
      <div className="flex-grow-1" data-testid="map-modal-preview">
        {boardContent}
      </div>
    </div>
  ) : (
    <div data-testid="map-modal-preview">{boardContent}</div>
  );

  const footerContent = (
    <Button className="action-btn close-btn" onClick={handleModalHide} data-testid="map-modal-close">
      Close
    </Button>
  );

  if (isBackground) {
    return (
      <div
        className={backgroundClassName}
        style={backgroundStyle}
        data-testid="map-modal-wrapper"
      >
        <div
          ref={backgroundBoardContainerRef}
          className="map-modal-background__board"
          role="region"
          aria-label={backgroundAriaLabel}
        >
          <div className={backgroundBoardClassName} style={backgroundBoardStyleValue}>
            {boardContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal
      className={modalClassName}
      show={show}
      onHide={handleModalHide}
      size={hasManagementFeatures ? 'xl' : 'lg'}
      centered={!isDocked}
      backdrop={isDocked ? false : true}
      enforceFocus={!isDocked}
      restoreFocus={!isDocked}
      dialogClassName={dialogClassName}
      data-testid="map-modal-wrapper"
    >
      <Modal.Header className="modal-header">
        <DockControls
          dockedSide={dockedSide}
          onDockChange={onDockChange}
          isDocked={isDocked}
        />
        <Modal.Title>{titleContent}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{bodyContent}</Modal.Body>
      <Modal.Footer>{footerContent}</Modal.Footer>
    </Modal>
  );
};

MapModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  map: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  maps: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])),
  activeMapId: PropTypes.string,
  selectedMapId: PropTypes.string,
  onSelectMap: PropTypes.func,
  onActivateMap: PropTypes.func,
  onDeleteMap: PropTypes.func,
  isLoading: PropTypes.bool,
  actionInProgressId: PropTypes.string,
  emptyMessage: PropTypes.node,
  title: PropTypes.node,
  tokensByMapId: PropTypes.object,
  currentCharacterId: PropTypes.string,
  activeCharacterId: PropTypes.string,
  characterLookup: PropTypes.objectOf(
    PropTypes.shape({
      color: PropTypes.string,
      label: PropTypes.string,
      entityType: PropTypes.string,
      currentHp: PropTypes.number,
      maxHp: PropTypes.number,
      size: PropTypes.string,
      figurineImageUrl: PropTypes.string,
      figurineImagePublicId: PropTypes.string,
    })
  ),
  onTokenMove: PropTypes.func,
  onTokenRemove: PropTypes.func,
  readOnly: PropTypes.bool,
  isDocked: PropTypes.bool,
  dockedSide: PropTypes.oneOf(['left', 'right']),
  onDockClose: PropTypes.func,
  onDockChange: PropTypes.func,
  displayMode: PropTypes.oneOf(['modal', 'background']),
};

MapModal.defaultProps = {
  show: false,
  onHide: () => {},
  map: null,
  maps: [],
  activeMapId: null,
  selectedMapId: null,
  onSelectMap: null,
  onActivateMap: null,
  onDeleteMap: null,
  isLoading: false,
  actionInProgressId: null,
  emptyMessage: 'No maps saved yet.',
  title: 'Campaign Map',
  tokensByMapId: null,
  currentCharacterId: null,
  activeCharacterId: null,
  characterLookup: {},
  onTokenMove: null,
  onTokenRemove: null,
  readOnly: true,
  isDocked: false,
  dockedSide: null,
  onDockClose: null,
  onDockChange: null,
  displayMode: 'modal',
};

export default MapModal;
