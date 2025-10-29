import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ListGroup, Badge, Spinner, Alert, CloseButton } from 'react-bootstrap';
import CampaignMapBoard from './CampaignMapBoard';
import { groupMapsByFolder, UNGROUPED_FOLDER_KEY } from '../utils/mapGrouping';
import { resolveFigurineImageData } from '../utils/figurineAssets';
import DockControls from '../components/DockControls';
import classNames from '../../../utils/classNames';
import usePointerEventsSupported from '../../../hooks/usePointerEventsSupported';
import { enhanceMouseEvent, enhanceTouchEvent } from '../../../utils/pointerEvents';

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

const normalizeMapId = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const MAP_IDENTIFIER_KEYS = ['mapId', '_id', 'id', 'uuid', 'guid', 'slug', 'identifier'];

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

const buildMapImageSource = (map) => {
  if (!map || typeof map !== 'object') {
    return null;
  }

  const { imageUrl, imageBase64, imageType } = map;

  if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
    return imageUrl.trim();
  }

  if (typeof imageBase64 === 'string' && imageBase64.trim() !== '') {
    const mimeType =
      typeof imageType === 'string' && imageType.trim() !== ''
        ? imageType.trim()
        : 'image/png';
    return `data:${mimeType};base64,${imageBase64.trim()}`;
  }

  return null;
};

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

const BACKGROUND_DEFAULT_SCALE = 1;
const BACKGROUND_DRAG_THRESHOLD = 4;

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
  const backgroundBoardRef = useRef(null);
  const backgroundDragStateRef = useRef(null);
  const pointerEventsSupported = usePointerEventsSupported();
  const normalizedMaps = useMemo(() => normalizeMaps(maps), [maps]);
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
  }, [normalizedMaps, resolvedSelectedId, normalizedActiveId, map]);

  const backgroundImageSrc = useMemo(
    () => buildMapImageSource(previewMap),
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

  const backgroundClassName = useMemo(() => {
    const classes = ['map-modal-background'];
    if (backgroundImageSrc) {
      classes.push('map-modal-background--has-image');
    }
    return classes.join(' ');
  }, [backgroundImageSrc]);

  const previewMapIdCandidates = useMemo(() => {
    const candidates = collectMapIdentifiers(previewMap, [normalizedActiveId]);

    if (normalizedSelectedId) {
      candidates.unshift(normalizedSelectedId);
    }

    return candidates.filter((value, index, array) => array.indexOf(value) === index);
  }, [normalizedActiveId, normalizedSelectedId, previewMap]);

  const previewMapId = useMemo(() => previewMapIdCandidates[0] || null, [previewMapIdCandidates]);

  const groupedMaps = useMemo(
    () => groupMapsByFolder(normalizedMaps),
    [normalizedMaps]
  );

  const [backgroundPan, setBackgroundPan] = useState({ x: 0, y: 0 });
  const [isBackgroundDragging, setIsBackgroundDragging] = useState(false);
  const [backgroundImageMetrics, setBackgroundImageMetrics] = useState({ width: null, height: null });
  const [backgroundContainerSize, setBackgroundContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isBackground) {
      return;
    }

    setBackgroundPan({ x: 0, y: 0 });
    setIsBackgroundDragging(false);
  }, [isBackground, previewMapId]);

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

  const normalizedCurrentCharacterIdLower = useMemo(() => {
    if (!normalizedCurrentCharacterId) {
      return null;
    }

    return normalizedCurrentCharacterId.toLowerCase();
  }, [normalizedCurrentCharacterId]);

  const normalizedActiveCharacterId = useMemo(
    () => normalizeMapId(activeCharacterId),
    [activeCharacterId]
  );

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

        const entry = tokensByMapId[candidate];
        if (entry && typeof entry === 'object') {
          return sanitizeTokenDictionary(entry);
        }
      }
    }

    if (previewMap && typeof previewMap === 'object' && previewMap.tokens) {
      return sanitizeTokenDictionary(previewMap.tokens);
    }

    return {};
  }, [previewMap, previewMapIdCandidates, tokensByMapId]);

  const [placementPending, setPlacementPending] = useState(false);
  const [placementError, setPlacementError] = useState(null);
  const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = useState(true);

  useEffect(() => {
    if (!show) {
      setPlacementPending(false);
      setPlacementError(null);
    }
  }, [show]);

  useEffect(() => {
    setPlacementError(null);
    setPlacementPending(false);
  }, [previewMapId, currentCharacterId]);

  useEffect(() => {
    if (!isBackground) {
      return;
    }

    if (show) {
      setIsBackgroundPanelOpen(true);
    } else {
      setIsBackgroundPanelOpen(false);
    }
  }, [isBackground, show]);

  const isInteractive = useMemo(
    () => typeof onTokenMove === 'function' && previewMapIdCandidates.length > 0,
    [onTokenMove, previewMapIdCandidates]
  );

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

        const matchesCurrentCharacter = Boolean(
          normalizedCurrentCharacterIdLower &&
            tokenIdentifier &&
            tokenIdentifier.toLowerCase() === normalizedCurrentCharacterIdLower
        );

        const isMovable =
          isInteractive &&
          !placementPending &&
          (!readOnly || matchesCurrentCharacter);

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
          } else if (
            entityType === 'character' &&
            normalizedCurrentCharacterId &&
            token.characterId === normalizedCurrentCharacterId
          ) {
            variant = 'self';
          } else if (entityType === 'character') {
            variant = 'ally';
          } else if (entityType !== 'enemy') {
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
    isInteractive,
    normalizedCharacterLookup,
    normalizedCurrentCharacterId,
    normalizedActiveCharacterId,
    placementPending,
    readOnly,
    tokensDictionary,
  ]);

  const currentToken = useMemo(() => {
    if (!normalizedCurrentCharacterId) {
      return null;
    }

    const directMatch = tokensDictionary[normalizedCurrentCharacterId];
    if (directMatch) {
      return directMatch;
    }

    const targetLower = normalizedCurrentCharacterId.toLowerCase();

    const fallbackMatch = Object.values(tokensDictionary).find((token) => {
      const tokenId = normalizeMapId(token?.characterId);
      return tokenId && tokenId.toLowerCase() === targetLower;
    });

    return fallbackMatch || null;
  }, [normalizedCurrentCharacterId, tokensDictionary]);

  const handleCommitMove = useCallback(
    async ({ characterId, x, y, rotation }) => {
      if (!isInteractive || placementPending) {
        return;
      }

      const normalizedCharacterId = normalizeMapId(characterId);
      if (!normalizedCharacterId || !previewMapId) {
        return;
      }

      if (readOnly && normalizedCharacterId !== normalizedCurrentCharacterId) {
        return;
      }

      setPlacementPending(true);
      setPlacementError(null);

      try {
        const payload = {
          mapId: previewMapId,
          characterId: normalizedCharacterId,
          x,
          y,
        };

        if (Number.isFinite(rotation)) {
          payload.rotation = rotation;
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
      normalizedCurrentCharacterId,
      isInteractive,
      onTokenMove,
      placementPending,
      previewMapId,
      readOnly,
    ]
  );

  const handleTokenPositionChange = useCallback(
    ({ characterId, x, y, rotation }) => {
      if (!isInteractive) {
        return;
      }

      handleCommitMove({ characterId, x, y, rotation });
    },
    [handleCommitMove, isInteractive]
  );

  const handleBackgroundPlacement = useCallback(
    ({ x, y }) => {
      if (!isInteractive || placementPending) {
        return;
      }

      if (!normalizedCurrentCharacterId || currentToken) {
        return;
      }

      handleCommitMove({ characterId: normalizedCurrentCharacterId, x, y });
    },
    [currentToken, handleCommitMove, isInteractive, normalizedCurrentCharacterId, placementPending]
  );

  const computeNormalizedBackgroundCoords = useCallback((clientX, clientY) => {
    const container = backgroundBoardRef.current;
    if (!container || typeof container.querySelector !== 'function') {
      return null;
    }

    const imageWrapper = container.querySelector('.campaign-map-board__image-wrapper');
    if (!imageWrapper || typeof imageWrapper.getBoundingClientRect !== 'function') {
      return null;
    }

    const rect = imageWrapper.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;

    if (!Number.isFinite(relativeX) || !Number.isFinite(relativeY)) {
      return null;
    }

    const clampedX = Math.min(1, Math.max(0, relativeX));
    const clampedY = Math.min(1, Math.max(0, relativeY));

    return { x: clampedX, y: clampedY };
  }, []);

  const handleBackgroundPointerDownCapture = useCallback(
    (event) => {
      if (!isBackground) {
        backgroundDragStateRef.current = null;
        return;
      }

      const target = event.target;
      if (!target || typeof target.closest !== 'function') {
        backgroundDragStateRef.current = null;
        return;
      }

      if (target.closest('.map-modal-background__overlay')) {
        backgroundDragStateRef.current = null;
        return;
      }

      if (target.closest('.campaign-map-board__token') || target.closest('.campaign-map-board__rotation-controls')) {
        backgroundDragStateRef.current = null;
        return;
      }

      const pointerButton = event.button;
      const isPrimaryPointer = pointerButton === 0 || pointerButton === -1;
      const isTouch = event.pointerType === 'touch';
      if (!isPrimaryPointer && !isTouch) {
        backgroundDragStateRef.current = null;
        return;
      }

      const container = backgroundBoardRef.current;
      if (!container) {
        backgroundDragStateRef.current = null;
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      if (pointerEventsSupported && event.pointerId !== undefined) {
        try {
          container.setPointerCapture?.(event.pointerId);
        } catch (error) {
          // Ignore pointer capture failures in environments that do not support it.
        }
      }

      backgroundDragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: backgroundPan.x,
        originY: backgroundPan.y,
        hasMoved: false,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        shouldHandlePlacement: isPrimaryPointer,
      };
    },
    [backgroundPan.x, backgroundPan.y, isBackground, pointerEventsSupported]
  );

  const finalizeBackgroundDrag = useCallback(() => {
    const container = backgroundBoardRef.current;
    const state = backgroundDragStateRef.current;
    if (container && state && state.pointerId !== undefined) {
      try {
        container.releasePointerCapture?.(state.pointerId);
      } catch (error) {
        // Ignore pointer capture release failures.
      }
    }
    backgroundDragStateRef.current = null;
    setIsBackgroundDragging(false);
  }, []);

  const clampBackgroundPan = useCallback(
    (pan) => {
      const { width: boardWidth, height: boardHeight } = backgroundBoardDimensions || {};
      const { width: containerWidth, height: containerHeight } = backgroundContainerSize;

      if (
        !Number.isFinite(boardWidth) ||
        !Number.isFinite(boardHeight) ||
        !Number.isFinite(containerWidth) ||
        !Number.isFinite(containerHeight)
      ) {
        return pan;
      }

      const maxOffsetX = Math.max(0, (boardWidth - containerWidth) / 2);
      const maxOffsetY = Math.max(0, (boardHeight - containerHeight) / 2);

      const nextX = maxOffsetX === 0 ? 0 : Math.min(Math.max(pan.x, -maxOffsetX), maxOffsetX);
      const nextY = maxOffsetY === 0 ? 0 : Math.min(Math.max(pan.y, -maxOffsetY), maxOffsetY);

      if (nextX === pan.x && nextY === pan.y) {
        return pan;
      }

      return { x: nextX, y: nextY };
    },
    [backgroundBoardDimensions, backgroundContainerSize]
  );

  useEffect(() => {
    if (!isBackground) {
      return;
    }

    setBackgroundPan((previous) => clampBackgroundPan(previous));
  }, [clampBackgroundPan, isBackground]);

  const handleBackgroundPointerMove = useCallback(
    (event) => {
      if (!isBackground) {
        return;
      }

      const state = backgroundDragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;

      if (!state.hasMoved) {
        const distance = Math.hypot(deltaX, deltaY);
        if (distance >= BACKGROUND_DRAG_THRESHOLD) {
          state.hasMoved = true;
          setIsBackgroundDragging(true);
        }
      }

      state.lastClientX = event.clientX;
      state.lastClientY = event.clientY;

      if (!state.hasMoved) {
        return;
      }

      event.preventDefault();
      setBackgroundPan((previous) => {
        const desired = {
          x: state.originX + deltaX,
          y: state.originY + deltaY,
        };

        const clamped = clampBackgroundPan(desired);

        if (clamped === previous || (clamped.x === previous.x && clamped.y === previous.y)) {
          return previous;
        }

        return clamped;
      });
    },
    [clampBackgroundPan, isBackground]
  );

  const handleBackgroundPointerEnd = useCallback(
    (event) => {
      if (!isBackground) {
        return;
      }

      const state = backgroundDragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();

      if (state.hasMoved) {
        event.preventDefault();
        finalizeBackgroundDrag();
        return;
      }

      if (state.shouldHandlePlacement) {
        const coords = computeNormalizedBackgroundCoords(event.clientX, event.clientY);
        if (coords) {
          handleBackgroundPlacement(coords);
        }
      }

      finalizeBackgroundDrag();
    },
    [computeNormalizedBackgroundCoords, finalizeBackgroundDrag, handleBackgroundPlacement, isBackground]
  );

  const handleBackgroundPointerCancel = useCallback(
    (event) => {
      if (!isBackground) {
        return;
      }

      const state = backgroundDragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();
      finalizeBackgroundDrag();
    },
    [finalizeBackgroundDrag, isBackground]
  );

  const backgroundBoardStyleValue = useMemo(() => {
    const style = {
      '--map-modal-background-scale': BACKGROUND_DEFAULT_SCALE,
      transform: `translate(calc(-50% + ${backgroundPan.x}px), calc(-50% + ${backgroundPan.y}px)) scale(${BACKGROUND_DEFAULT_SCALE})`,
    };

    if (backgroundBoardDimensions) {
      style.width = `${backgroundBoardDimensions.width}px`;
      style.height = `${backgroundBoardDimensions.height}px`;
    }

    return style;
  }, [backgroundBoardDimensions, backgroundPan.x, backgroundPan.y]);

  const backgroundBoardClassName = classNames(
    'map-modal-background__board-inner',
    isBackgroundDragging && 'map-modal-background__board-inner--dragging'
  );

  const backgroundPointerHandlers = useMemo(() => {
    if (!isBackground) {
      return {};
    }

    const handlers = {
      onPointerDownCapture: handleBackgroundPointerDownCapture,
      onPointerMoveCapture: handleBackgroundPointerMove,
      onPointerUpCapture: handleBackgroundPointerEnd,
      onPointerCancelCapture: handleBackgroundPointerCancel,
    };

    if (!pointerEventsSupported) {
      handlers.onMouseDownCapture = (event) =>
        handleBackgroundPointerDownCapture(enhanceMouseEvent(event));
      handlers.onMouseMoveCapture = (event) =>
        handleBackgroundPointerMove(enhanceMouseEvent(event));
      handlers.onMouseUpCapture = (event) =>
        handleBackgroundPointerEnd(enhanceMouseEvent(event));
      handlers.onMouseLeaveCapture = (event) =>
        handleBackgroundPointerCancel(enhanceMouseEvent(event));
      handlers.onTouchStartCapture = (event) =>
        handleBackgroundPointerDownCapture(enhanceTouchEvent(event));
      handlers.onTouchMoveCapture = (event) =>
        handleBackgroundPointerMove(enhanceTouchEvent(event));
      handlers.onTouchEndCapture = (event) =>
        handleBackgroundPointerEnd(enhanceTouchEvent(event));
      handlers.onTouchCancelCapture = (event) =>
        handleBackgroundPointerCancel(enhanceTouchEvent(event));
    }

    return handlers;
  }, [
    handleBackgroundPointerCancel,
    handleBackgroundPointerDownCapture,
    handleBackgroundPointerEnd,
    handleBackgroundPointerMove,
    isBackground,
    pointerEventsSupported,
  ]);

  const handleTokenRemove = useCallback(
    ({ characterId, token }) => {
      if (!isInteractive || placementPending) {
        return false;
      }

      if (typeof onTokenRemove !== 'function' || !previewMapId) {
        return false;
      }

      const normalizedCharacterId = normalizeMapId(characterId);
      if (!normalizedCharacterId) {
        return false;
      }

      if (readOnly && normalizedCharacterId !== normalizedCurrentCharacterId) {
        return false;
      }

      const payload = {
        mapId: previewMapId,
        characterId: normalizedCharacterId,
      };

      if (token) {
        payload.token = token;
      } else if (tokensDictionary[normalizedCharacterId]) {
        payload.token = tokensDictionary[normalizedCharacterId];
      }

      return onTokenRemove(payload);
    },
    [
      isInteractive,
      placementPending,
      onTokenRemove,
      previewMapId,
      readOnly,
      normalizedCurrentCharacterId,
      tokensDictionary,
    ]
  );

  const canClickToPlace = useMemo(
    () =>
      Boolean(
        isInteractive &&
          !placementPending &&
          normalizedCurrentCharacterId &&
          !currentToken
      ),
    [currentToken, isInteractive, normalizedCurrentCharacterId, placementPending]
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
              isInteractive ? handleTokenPositionChange : undefined
            }
            onBackgroundClick={isInteractive ? handleBackgroundPlacement : undefined}
            onTokenRemove={isInteractive ? handleTokenRemove : undefined}
          />
          {isInteractive && placementPending && (
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
        {isInteractive && canClickToPlace && (
          <div className="text-info small mt-3" data-testid="map-modal-placement-hint">
            Click the map to place your figurine.
          </div>
        )}
        {isInteractive && placementError && (
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
          <div
            ref={backgroundBoardRef}
            className={backgroundBoardClassName}
            style={backgroundBoardStyleValue}
            {...backgroundPointerHandlers}
          >
            {boardContent}
          </div>
        </div>
        {show && (
          <div
            className="map-modal-background__overlay"
            role="dialog"
            aria-modal="false"
            aria-label={backgroundAriaLabel}
          >
            {isBackgroundPanelOpen ? (
              <div className="map-modal-background__overlay-content">
                <header className="map-modal-background__header">
                  <div className="map-modal-background__header-inner">
                    <h2 className="map-modal-background__title">{titleContent}</h2>
                    <div className="map-modal-background__header-actions">
                      <Button
                        variant="outline-light"
                        size="sm"
                        className="map-modal-background__collapse"
                        onClick={() => setIsBackgroundPanelOpen(false)}
                        data-testid="map-modal-background-hide-panel"
                      >
                        Hide panel
                      </Button>
                      <CloseButton
                        variant="white"
                        onClick={handleModalHide}
                        aria-label="Close map"
                        data-testid="map-modal-close-button"
                      />
                    </div>
                  </div>
                </header>
                <div className="map-modal-background__body">{bodyContent}</div>
                <footer className="map-modal-background__footer">{footerContent}</footer>
              </div>
            ) : (
              <div className="map-modal-background__overlay-toggle">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBackgroundPanelOpen(true)}
                  data-testid="map-modal-background-show-panel"
                >
                  Show map controls
                </Button>
                <CloseButton
                  variant="white"
                  onClick={handleModalHide}
                  aria-label="Close map"
                  data-testid="map-modal-close-button"
                />
              </div>
            )}
          </div>
        )}
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
