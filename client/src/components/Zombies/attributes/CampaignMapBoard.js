import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from '../../../utils/classNames';
import { ENEMY_FIGURINE_COLOR } from '../constants/tokenAppearance';
import { resolveFigurineImageData } from '../utils/figurineAssets';

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

const getHealthColor = (ratio) => {
  const clampedRatio = clamp01(ratio);
  if (clampedRatio === null) {
    return '#51cf66';
  }

  const hue = Math.round(120 * clampedRatio);
  return `hsl(${hue}, 70%, 45%)`;
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatHpValue = (value) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const clamped = value < 0 ? 0 : value;
  if (Number.isInteger(clamped)) {
    return `${clamped}`;
  }

  const precision = Math.abs(clamped) >= 100 ? 0 : 1;
  return clamped.toFixed(precision);
};

const buildImageSource = ({ imageUrl, imageBase64, imageType }) => {
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

const normalizeText = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const FIGURINE_SIZE_MULTIPLIERS = {
  tiny: 0.5,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
};

const MAX_FIGURINE_GRID_SQUARES = FIGURINE_SIZE_MULTIPLIERS.gargantuan;
const DEFAULT_FIGURINE_GRID_SQUARES = FIGURINE_SIZE_MULTIPLIERS.medium;
const FALLBACK_FIGURINE_PIXEL_SQUARE_SIZE = 512;

const DEFAULT_GRID_DIMENSION = 24;

const parsePositiveNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/([0-9]*\.?[0-9]+)/);
    if (match) {
      const parsed = Number.parseFloat(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
};

const parseGridDimensionsFromValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const [first, second] = value;
    const firstNumber = parsePositiveNumber(first);
    const secondNumber = parsePositiveNumber(second);

    if (firstNumber !== null || secondNumber !== null) {
      const resolvedFirst = firstNumber ?? secondNumber;
      const resolvedSecond = secondNumber ?? firstNumber;
      if (resolvedFirst !== null) {
        return {
          columns: Math.max(1, Math.round(resolvedFirst)),
          rows: Math.max(1, Math.round(resolvedSecond ?? resolvedFirst)),
        };
      }
    }

    return null;
  }

  const numericValue = parsePositiveNumber(value);
  if (numericValue !== null) {
    const rounded = Math.max(1, Math.round(numericValue));
    return { columns: rounded, rows: rounded };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const pairMatch = trimmed.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (pairMatch) {
      const [, columnMatch, rowMatch] = pairMatch;
      const parsedColumns = Number.parseInt(columnMatch, 10);
      const parsedRows = Number.parseInt(rowMatch, 10);
      if (Number.isFinite(parsedColumns) && Number.isFinite(parsedRows)) {
        return {
          columns: Math.max(1, parsedColumns),
          rows: Math.max(1, parsedRows),
        };
      }
    }
  }

  return null;
};

const resolveGridDimensions = (map) => {
  if (!map || typeof map !== 'object') {
    return { columns: DEFAULT_GRID_DIMENSION, rows: DEFAULT_GRID_DIMENSION };
  }

  const assignDimension = (current, value) => {
    const parsed = parsePositiveNumber(value);
    if (parsed === null) {
      return current;
    }

    const rounded = Math.max(1, Math.round(parsed));
    return current ?? rounded;
  };

  let columns = null;
  let rows = null;

  const gridLikeObjects = [map.grid, map.meta, map.metadata, map.settings, map.details];
  const directColumnCandidates = [
    map.gridColumns,
    map.gridWidth,
    map.columns,
    map.widthSquares,
    map.width,
  ];
  const directRowCandidates = [
    map.gridRows,
    map.gridHeight,
    map.rows,
    map.heightSquares,
    map.height,
  ];

  directColumnCandidates.forEach((candidate) => {
    columns = assignDimension(columns, candidate);
  });
  directRowCandidates.forEach((candidate) => {
    rows = assignDimension(rows, candidate);
  });

  gridLikeObjects.forEach((obj) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    columns = assignDimension(columns, obj.columns ?? obj.cols ?? obj.width);
    rows = assignDimension(rows, obj.rows ?? obj.height);

    if (columns !== null && rows !== null) {
      return;
    }

    const dimensionsValue =
      obj.dimensions ?? obj.size ?? obj.gridSize ?? obj.gridDimensions ?? obj.shape;
    const parsedDimensions = parseGridDimensionsFromValue(dimensionsValue);
    if (parsedDimensions) {
      if (columns === null && parsedDimensions.columns) {
        columns = parsedDimensions.columns;
      }
      if (rows === null && parsedDimensions.rows) {
        rows = parsedDimensions.rows;
      }
    }
  });

  const fallbackDimensionStrings = [
    map.gridSize,
    map.gridDimensions,
    map.dimensions,
    map.size,
    map.mapSize,
  ];

  fallbackDimensionStrings.forEach((value) => {
    if (columns !== null && rows !== null) {
      return;
    }

    const parsed = parseGridDimensionsFromValue(value);
    if (!parsed) {
      return;
    }

    if (columns === null && parsed.columns) {
      columns = parsed.columns;
    }
    if (rows === null && parsed.rows) {
      rows = parsed.rows;
    }
  });

  const safeColumns = columns ?? DEFAULT_GRID_DIMENSION;
  const safeRows = rows ?? safeColumns;

  return {
    columns: Math.max(1, safeColumns),
    rows: Math.max(1, safeRows),
  };
};

const resolveSquareSizeFromMetadata = (map) => {
  if (!map || typeof map !== 'object') {
    return null;
  }

  const candidatePaths = [
    ['squareSize'],
    ['square_size'],
    ['squareSizePixels'],
    ['squareSizePx'],
    ['squarePixelSize'],
    ['square_pixels'],
    ['square_size_pixels'],
    ['squareDimension'],
    ['pixelsPerSquare'],
    ['pixelPerSquare'],
    ['gridSquareSize'],
    ['grid', 'squareSize'],
    ['grid', 'cellSize'],
    ['grid', 'pixelsPerSquare'],
    ['grid', 'squarePixels'],
    ['meta', 'squareSize'],
    ['meta', 'pixelsPerSquare'],
    ['metadata', 'squareSize'],
    ['metadata', 'pixelsPerSquare'],
    ['settings', 'squareSize'],
    ['settings', 'pixelsPerSquare'],
    ['details', 'squareSize'],
    ['details', 'pixelsPerSquare'],
  ];

  for (const path of candidatePaths) {
    let current = map;
    let found = true;

    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }

    if (!found) {
      continue;
    }

    const parsed = parsePositiveNumber(current);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const resolveFigurineSizeKey = (value) => {
  if (typeof value !== 'string') {
    return 'medium';
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return 'medium';
  }

  if (FIGURINE_SIZE_MULTIPLIERS[trimmed]) {
    return trimmed;
  }

  const tokens = trimmed.split(/[^a-z]+/).filter(Boolean);
  const tokenMatch = tokens.find((token) => FIGURINE_SIZE_MULTIPLIERS[token]);
  if (tokenMatch) {
    return tokenMatch;
  }

  const prefixMatch = Object.keys(FIGURINE_SIZE_MULTIPLIERS).find((key) =>
    trimmed.startsWith(key)
  );
  if (prefixMatch) {
    return prefixMatch;
  }

  return 'medium';
};

const resolveFigurineSquaresFromImageSize = (metrics, metadataSquareSize) => {
  if (!metrics || typeof metrics !== 'object') {
    return null;
  }

  const { width, height } = metrics;
  const numericWidth = Number(width);
  const numericHeight = Number(height);

  if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight)) {
    return null;
  }

  if (numericWidth <= 0 || numericHeight <= 0) {
    return null;
  }

  const maxDimension = Math.max(numericWidth, numericHeight);
  const squareSize = Number.isFinite(metadataSquareSize) && metadataSquareSize > 0
    ? metadataSquareSize
    : FALLBACK_FIGURINE_PIXEL_SQUARE_SIZE;

  if (!Number.isFinite(squareSize) || squareSize <= 0) {
    return null;
  }

  const rawSquares = maxDimension / squareSize;

  if (!Number.isFinite(rawSquares) || rawSquares <= 0) {
    return null;
  }

  const rounded = Math.round(rawSquares);
  return Math.max(1, Math.min(MAX_FIGURINE_GRID_SQUARES, rounded));
};

const ROTATION_STEP_DEGREES = 15;

const TWO_PI = Math.PI * 2;

const normalizeDegrees = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const normalized = parsed % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const radiansToDegrees = (radians) => (Number(radians) * 180) / Math.PI;

const CampaignMapBoard = ({
  map,
  tokens,
  onTokenDragStart,
  onTokenDrag,
  onTokenDragEnd,
  onTokenPositionChange,
  onBackgroundClick,
  onTokenRemove,
  disabled,
  className,
  children,
}) => {
  const safeMap = map && typeof map === 'object' ? map : {};
  const title = normalizeText(safeMap.title);
  const altText =
    normalizeText(safeMap.altText) ||
    title ||
    normalizeText(safeMap.prompt) ||
    'Campaign map image';
  const imageSrc = buildImageSource(safeMap);

  const interactionDisabled = disabled || !imageSrc;

  const boardRef = useRef(null);
  const layerRef = useRef(null);
  const dragStateRef = useRef({ tokenId: null, pointerId: null });
  const [dragPositions, setDragPositions] = useState({});
  const [activeLabelTokenId, setActiveLabelTokenId] = useState(null);
  const [lastDraggedTokenId, setLastDraggedTokenId] = useState(null);
  const [rotationOverrides, setRotationOverrides] = useState({});
  const rotationOverridesRef = useRef({});
  const [rotationHandleAngles, setRotationHandleAngles] = useState({});
  const [draggingRotationTokenId, setDraggingRotationTokenId] = useState(null);
  const tokenPositionsRef = useRef([]);
  const [layerNode, setLayerNode] = useState(null);
  const [figurineImageMetrics, setFigurineImageMetrics] = useState({});
  const rotationDragStateRef = useRef(null);
  const rotationMoveHandlerRef = useRef(null);
  const rotationUpHandlerRef = useRef(null);
  const rotationCancelHandlerRef = useRef(null);
  const handleLayerRef = useCallback((node) => {
    layerRef.current = node;
    setLayerNode(node);
  }, []);

  const handleFigurineImageLoad = useCallback((metricKey, target) => {
    if (!metricKey || !target) {
      return;
    }

    const { naturalWidth, naturalHeight } = target;

    if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight)) {
      return;
    }

    setFigurineImageMetrics((prev) => {
      const nextWidth = Math.round(naturalWidth);
      const nextHeight = Math.round(naturalHeight);
      const existing = prev[metricKey];

      if (existing && existing.width === nextWidth && existing.height === nextHeight) {
        return prev;
      }

      return {
        ...prev,
        [metricKey]: {
          width: nextWidth,
          height: nextHeight,
        },
      };
    });
  }, []);

  const { columns: gridColumns, rows: gridRows } = useMemo(
    () => resolveGridDimensions(map),
    [map]
  );
  const metadataSquareSize = useMemo(() => resolveSquareSizeFromMetadata(map), [map]);

  useEffect(() => {
    const boardElement = boardRef.current;

    if (!boardElement) {
      return () => {};
    }

    const safeColumns = Math.max(1, gridColumns || DEFAULT_GRID_DIMENSION);
    const safeRows = Math.max(1, gridRows || safeColumns);
    const columnWidthPercent = `${100 / safeColumns}%`;
    const rowHeightPercent = `${100 / safeRows}%`;

    boardElement.style.setProperty('--campaign-map-grid-columns', `${safeColumns}`);
    boardElement.style.setProperty('--campaign-map-grid-rows', `${safeRows}`);
    boardElement.style.setProperty('--campaign-map-grid-cell-width', columnWidthPercent);
    boardElement.style.setProperty('--campaign-map-grid-cell-height', rowHeightPercent);

    const cleanupGridVariables = () => {
      boardElement.style.removeProperty('--campaign-map-grid-columns');
      boardElement.style.removeProperty('--campaign-map-grid-rows');
      boardElement.style.removeProperty('--campaign-map-grid-cell-width');
      boardElement.style.removeProperty('--campaign-map-grid-cell-height');
    };

    if (metadataSquareSize !== null) {
      boardElement.style.setProperty(
        '--campaign-map-square-size',
        `${metadataSquareSize}px`
      );

      return () => {
        boardElement.style.removeProperty('--campaign-map-square-size');
        cleanupGridVariables();
      };
    }

    const layerElement = layerNode;

    if (!layerElement) {
      boardElement.style.removeProperty('--campaign-map-square-size');
      return () => {
        cleanupGridVariables();
      };
    }

    const updateSquareSize = () => {
      const rect = layerElement.getBoundingClientRect();
      const widthPerColumn = rect.width ? rect.width / safeColumns : null;
      const heightPerRow = rect.height ? rect.height / safeRows : null;
      const candidates = [widthPerColumn, heightPerRow].filter(
        (value) => Number.isFinite(value) && value > 0
      );

      if (candidates.length === 0) {
        boardElement.style.removeProperty('--campaign-map-square-size');
        return;
      }

      const resolved = Math.min(...candidates);
      boardElement.style.setProperty('--campaign-map-square-size', `${resolved}px`);
    };

    updateSquareSize();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        updateSquareSize();
      });
      observer.observe(layerElement);

      return () => {
        observer.disconnect();
        boardElement.style.removeProperty('--campaign-map-square-size');
        cleanupGridVariables();
      };
    }

    const handleResize = () => {
      updateSquareSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      boardElement.style.removeProperty('--campaign-map-square-size');
      cleanupGridVariables();
    };
  }, [gridColumns, gridRows, layerNode, metadataSquareSize]);

  const tokenPositions = useMemo(() => {
    if (!Array.isArray(tokens)) {
      return [];
    }

    return tokens
      .filter((token) => token && typeof token === 'object' && token.characterId)
      .map((token) => {
        const { characterId } = token;
        const activePosition =
          dragPositions[characterId] || {
            x: clamp01(token.x) ?? 0,
            y: clamp01(token.y) ?? 0,
          };
        return {
          ...token,
          position: activePosition,
        };
      });
  }, [tokens, dragPositions]);

  useEffect(() => {
    tokenPositionsRef.current = tokenPositions;
  }, [tokenPositions]);

  useEffect(() => {
    rotationOverridesRef.current = rotationOverrides;
  }, [rotationOverrides]);


  useEffect(() => {
    const activeIds = new Set(tokenPositions.map((token) => token?.characterId));

    setRotationOverrides((prev) => {
      const next = {};
      activeIds.forEach((id) => {
        if (Object.prototype.hasOwnProperty.call(prev, id)) {
          next[id] = prev[id];
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((key) => next[key] === prev[key])
      ) {
        return prev;
      }

      return next;
    });

    setRotationHandleAngles((prev) => {
      const next = {};
      activeIds.forEach((id) => {
        if (Object.prototype.hasOwnProperty.call(prev, id)) {
          next[id] = prev[id];
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && prevKeys.every((key) => next[key] === prev[key])) {
        return prev;
      }

      return next;
    });

    setLastDraggedTokenId((prev) => (prev && !activeIds.has(prev) ? null : prev));
  }, [tokenPositions]);

  const resetDragState = useCallback(() => {
    dragStateRef.current = { tokenId: null, pointerId: null };
    setDragPositions((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }
      return {};
    });
  }, []);

  const getNormalizedCoordinates = useCallback((clientX, clientY) => {
    const layer = layerRef.current;
    if (!layer) {
      return null;
    }

    const rect = layer.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;

    const x = clamp01(rawX);
    const y = clamp01(rawY);

    if (x === null || y === null) {
      return null;
    }

    return { x, y };
  }, []);

  const handlePointerDown = useCallback(
    (event, token) => {
      if (interactionDisabled || !token || token.isMovable === false) {
        return;
      }

      if (typeof event?.button === 'number' && event.button !== 0) {
        return;
      }

      const { characterId } = token;
      if (typeof characterId !== 'string' || characterId.trim() === '') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      dragStateRef.current = { tokenId: characterId, pointerId: event.pointerId };
      setDragPositions((prev) => ({
        ...prev,
        [characterId]: {
          x: clamp01(token.x) ?? 0,
          y: clamp01(token.y) ?? 0,
        },
      }));

      setLastDraggedTokenId(null);

      if (typeof onTokenDragStart === 'function') {
        onTokenDragStart({ token, characterId });
      }

      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore pointer capture errors (e.g., when unsupported)
        }
      }
    },
    [interactionDisabled, onTokenDragStart]
  );

  const updateDragPosition = useCallback((tokenId, nextPosition) => {
    if (!tokenId || !nextPosition) {
      return;
    }
    setDragPositions((prev) => ({
      ...prev,
      [tokenId]: nextPosition,
    }));
  }, []);

  const handlePointerMove = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || !dragState.tokenId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const coords = getNormalizedCoordinates(event.clientX, event.clientY);
      if (!coords) {
        return;
      }

      updateDragPosition(dragState.tokenId, coords);

      if (typeof onTokenDrag === 'function') {
        onTokenDrag({ characterId: dragState.tokenId, ...coords });
      }
    },
    [getNormalizedCoordinates, onTokenDrag, updateDragPosition]
  );

  const finalizeDrag = useCallback(
    (event, cancelled = false) => {
      const dragState = dragStateRef.current;
      if (!dragState || !dragState.tokenId) {
        return;
      }

      const { tokenId, pointerId } = dragState;
      if (
        pointerId !== undefined &&
        event.pointerId !== undefined &&
        event.pointerId !== pointerId
      ) {
        return;
      }

      const coords = getNormalizedCoordinates(event.clientX, event.clientY);
      if (!coords) {
        resetDragState();
        return;
      }

      updateDragPosition(tokenId, coords);

      if (typeof onTokenPositionChange === 'function' && !cancelled) {
        onTokenPositionChange({ characterId: tokenId, ...coords });
      }

      if (typeof onTokenDragEnd === 'function') {
        onTokenDragEnd({ characterId: tokenId, ...coords, cancelled });
      }

      resetDragState();
      setLastDraggedTokenId(cancelled ? null : tokenId);
    },
    [getNormalizedCoordinates, onTokenDragEnd, onTokenPositionChange, resetDragState, updateDragPosition]
  );

  const handlePointerUp = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || !dragState.tokenId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (dragState.tokenId) {
        setLastDraggedTokenId(dragState.tokenId);
      }
      finalizeDrag(event, false);
    },
    [finalizeDrag]
  );

  const handlePointerCancel = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || !dragState.tokenId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      finalizeDrag(event, true);
    },
    [finalizeDrag]
  );

  const handleLayerPointerDown = useCallback(
    (event) => {
      setActiveLabelTokenId(null);
      setLastDraggedTokenId(null);
      if (interactionDisabled || typeof onBackgroundClick !== 'function') {
        return;
      }

      if (event.target !== event.currentTarget) {
        return;
      }

      const coords = getNormalizedCoordinates(event.clientX, event.clientY);
      if (!coords) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onBackgroundClick(coords);
    },
    [
      getNormalizedCoordinates,
      interactionDisabled,
      onBackgroundClick,
      setActiveLabelTokenId,
    ]
  );

  const getResolvedRotationForToken = useCallback(
    (token) => {
      if (!token || !token.characterId) {
        return 0;
      }

      const override = rotationOverrides[token.characterId];
      if (Number.isFinite(override)) {
        return normalizeDegrees(override);
      }

      const baseRotation = Number(token.rotation);
      return Number.isFinite(baseRotation) ? normalizeDegrees(baseRotation) : 0;
    },
    [rotationOverrides]
  );

  const stopRotationDrag = useCallback(() => {
    const activeDragState = rotationDragStateRef.current;
    const targets = [];
    if (typeof window !== 'undefined') {
      targets.push(window);
    }
    if (typeof document !== 'undefined') {
      targets.push(document);
    }

    if (
      activeDragState &&
      activeDragState.handleElement &&
      typeof activeDragState.handleElement.releasePointerCapture === 'function' &&
      activeDragState.pointerId !== undefined
    ) {
      try {
        activeDragState.handleElement.releasePointerCapture(activeDragState.pointerId);
      } catch (releaseError) {
        // Ignore release errors – capturing might not be active or supported
      }
    }

    if (rotationMoveHandlerRef.current) {
      targets.forEach((target) => {
        if (target && typeof target.removeEventListener === 'function') {
          target.removeEventListener('pointermove', rotationMoveHandlerRef.current);
        }
      });
      rotationMoveHandlerRef.current = null;
    }

    if (rotationUpHandlerRef.current) {
      targets.forEach((target) => {
        if (target && typeof target.removeEventListener === 'function') {
          target.removeEventListener('pointerup', rotationUpHandlerRef.current);
        }
      });
      rotationUpHandlerRef.current = null;
    }

    if (rotationCancelHandlerRef.current) {
      targets.forEach((target) => {
        if (target && typeof target.removeEventListener === 'function') {
          target.removeEventListener('pointercancel', rotationCancelHandlerRef.current);
        }
      });
      rotationCancelHandlerRef.current = null;
    }

    rotationDragStateRef.current = null;
    setDraggingRotationTokenId(null);
  }, [setDraggingRotationTokenId]);

  useEffect(() => () => stopRotationDrag(), [stopRotationDrag]);

  useEffect(() => {
    if (interactionDisabled) {
      stopRotationDrag();
    }
  }, [interactionDisabled, stopRotationDrag]);

  const updateTokenRotation = useCallback(
    (tokenId, rotation) => {
      if (!tokenId || !Number.isFinite(rotation)) {
        return;
      }

      const tokensList = tokenPositionsRef.current;
      const normalizedRotation = normalizeDegrees(rotation);

      setRotationOverrides((prev) => {
        if (prev[tokenId] === normalizedRotation) {
          return prev;
        }

        return {
          ...prev,
          [tokenId]: normalizedRotation,
        };
      });

      setLastDraggedTokenId(tokenId);

      if (typeof onTokenPositionChange === 'function' && Array.isArray(tokensList)) {
        const foundToken = tokensList.find((entry) => entry?.characterId === tokenId);
        if (foundToken) {
          const candidatePosition =
            foundToken.position && typeof foundToken.position === 'object'
              ? foundToken.position
              : null;
          const normalizedX = clamp01(candidatePosition?.x ?? foundToken.x);
          const normalizedY = clamp01(candidatePosition?.y ?? foundToken.y);

          if (normalizedX !== null && normalizedY !== null) {
            onTokenPositionChange({
              characterId: tokenId,
              x: normalizedX,
              y: normalizedY,
              rotation: normalizedRotation,
            });
          }
        }
      }
    },
    [onTokenPositionChange]
  );


  const applyTokenRotation = useCallback(
    (tokenId, rotation) => {
      if (!tokenId || !Number.isFinite(rotation)) {
        return;
      }

      updateTokenRotation(tokenId, rotation);
    },
    [updateTokenRotation]
  );


  const rotateTokenBy = useCallback(
    (tokenId, delta) => {
      if (!tokenId || !Number.isFinite(delta)) {
        return;
      }

      const tokensList = tokenPositionsRef.current;
      const overrides = rotationOverridesRef.current || {};
      const currentOverride = overrides[tokenId];
      const baseRotation = Number.isFinite(currentOverride)
        ? currentOverride
        : (() => {
            if (!Array.isArray(tokensList)) {
              return 0;
            }
            const foundToken = tokensList.find((entry) => entry?.characterId === tokenId);
            const rawRotation = Number(foundToken?.rotation);
            return Number.isFinite(rawRotation) ? rawRotation : 0;
          })();

      const nextRotation = normalizeDegrees(baseRotation + delta);
      if (!Number.isFinite(nextRotation)) {
        return;
      }

      applyTokenRotation(tokenId, nextRotation);
    },
    [applyTokenRotation]
  );

  const handleRotationHandlePointerDown = useCallback(
    (event, tokenId, currentRotation) => {
      if (interactionDisabled || !tokenId) {
        return;
      }

      if (typeof event?.button === 'number' && event.button !== 0) {
        return;
      }

      const tokenElement = event.currentTarget?.closest('.campaign-map-board__token');
      if (!tokenElement) {
        return;
      }

      const rect = tokenElement.getBoundingClientRect();
      if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top)) {
        return;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const pointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const pointerDegrees = normalizeDegrees(radiansToDegrees(pointerAngle));
      const normalizedCurrent = normalizeDegrees(currentRotation);
      const initialHandleAngle = normalizeDegrees(pointerDegrees + 90);

      setRotationHandleAngles((prev) => {
        if (prev[tokenId] === initialHandleAngle) {
          return prev;
        }

        return {
          ...prev,
          [tokenId]: initialHandleAngle,
        };
      });

      stopRotationDrag();

      setDraggingRotationTokenId(tokenId);

      rotationDragStateRef.current = {
        tokenId,
        pointerId: event.pointerId,
        centerX,
        centerY,
        tokenElement,
        baseRotationDegrees: normalizedCurrent,
        initialPointerAngle: pointerAngle,
        lastPointerAngle: pointerAngle,
        unwrappedPointerAngle: pointerAngle,
        handleElement: event.currentTarget || null,
      };

      if (
        event.currentTarget &&
        typeof event.currentTarget.setPointerCapture === 'function' &&
        event.pointerId !== undefined
      ) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (captureError) {
          // Ignore capture errors – some browsers might throw if capture isn't supported
        }
      }

      const handleMove = (moveEvent) => {
        const dragState = rotationDragStateRef.current;
        if (!dragState || dragState.tokenId !== tokenId) {
          return;
        }

        if (
          dragState.pointerId !== undefined &&
          moveEvent.pointerId !== undefined &&
          moveEvent.pointerId !== dragState.pointerId
        ) {
          return;
        }

        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        let centerX = dragState.centerX;
        let centerY = dragState.centerY;

        if (
          dragState.tokenElement &&
          typeof dragState.tokenElement.getBoundingClientRect === 'function'
        ) {
          const updatedRect = dragState.tokenElement.getBoundingClientRect();
          if (
            updatedRect &&
            Number.isFinite(updatedRect.left) &&
            Number.isFinite(updatedRect.top)
          ) {
            centerX = updatedRect.left + updatedRect.width / 2;
            centerY = updatedRect.top + updatedRect.height / 2;
            dragState.centerX = centerX;
            dragState.centerY = centerY;
          }
        }

        const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        const { lastPointerAngle = angle, unwrappedPointerAngle = lastPointerAngle } = dragState;
        let delta = angle - lastPointerAngle;
        if (delta > Math.PI) {
          delta -= TWO_PI;
        } else if (delta < -Math.PI) {
          delta += TWO_PI;
        }

        const nextUnwrappedAngle = unwrappedPointerAngle + delta;
        dragState.lastPointerAngle = angle;
        dragState.unwrappedPointerAngle = nextUnwrappedAngle;

        const initialPointerAngle = dragState.initialPointerAngle ?? nextUnwrappedAngle;
        const baseRotationDegrees = dragState.baseRotationDegrees ?? 0;
        const deltaRadians = nextUnwrappedAngle - initialPointerAngle;
        const nextRotation = normalizeDegrees(
          baseRotationDegrees + radiansToDegrees(deltaRadians)
        );
        const handleAngle = normalizeDegrees(radiansToDegrees(nextUnwrappedAngle) + 90);

        setRotationHandleAngles((prev) => {
          if (prev[tokenId] === handleAngle) {
            return prev;
          }

          return {
            ...prev,
            [tokenId]: handleAngle,
          };
        });

        applyTokenRotation(tokenId, nextRotation);
      };

      const handleRelease = (releaseEvent) => {
        const dragState = rotationDragStateRef.current;
        if (!dragState || dragState.tokenId !== tokenId) {
          stopRotationDrag();
          return;
        }

        if (
          dragState.pointerId !== undefined &&
          releaseEvent.pointerId !== undefined &&
          releaseEvent.pointerId !== dragState.pointerId
        ) {
          return;
        }

        releaseEvent.preventDefault();
        releaseEvent.stopPropagation();
        stopRotationDrag();
      };

      const handleCancel = (cancelEvent) => {
        const dragState = rotationDragStateRef.current;
        if (
          dragState &&
          dragState.pointerId !== undefined &&
          cancelEvent.pointerId !== undefined &&
          cancelEvent.pointerId !== dragState.pointerId
        ) {
          return;
        }

        stopRotationDrag();
      };

      rotationMoveHandlerRef.current = handleMove;
      rotationUpHandlerRef.current = handleRelease;
      rotationCancelHandlerRef.current = handleCancel;

      const targets = [];
      if (typeof window !== 'undefined') {
        targets.push(window);
      }
      if (typeof document !== 'undefined') {
        targets.push(document);
      }

      targets.forEach((target) => {
        if (target && typeof target.addEventListener === 'function') {
          target.addEventListener('pointermove', handleMove, { passive: false });
          target.addEventListener('pointerup', handleRelease, { passive: false });
          target.addEventListener('pointercancel', handleCancel, { passive: false });
        }
      });

      setLastDraggedTokenId(tokenId);

      event.preventDefault();
      event.stopPropagation();
    },
    [applyTokenRotation, interactionDisabled, setDraggingRotationTokenId, stopRotationDrag]
  );

  const lockRotation = useCallback((tokenId) => {
    if (!tokenId) {
      setLastDraggedTokenId(null);
      return;
    }

    setLastDraggedTokenId((prev) => (prev === tokenId ? null : prev));
  }, []);

  useEffect(() => {
    if (!lastDraggedTokenId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (!event || typeof event.key !== 'string') {
        return;
      }

      const key = event.key;
      const lowerKey = key.toLowerCase();

      if (
        key === 'ArrowLeft' ||
        key === '[' ||
        key === '{' ||
        lowerKey === 'a' ||
        lowerKey === 'q'
      ) {
        event.preventDefault();
        rotateTokenBy(lastDraggedTokenId, -ROTATION_STEP_DEGREES);
        return;
      }

      if (
        key === 'ArrowRight' ||
        key === ']' ||
        key === '}' ||
        lowerKey === 'd' ||
        lowerKey === 'e'
      ) {
        event.preventDefault();
        rotateTokenBy(lastDraggedTokenId, ROTATION_STEP_DEGREES);
        return;
      }

      if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Escape') {
        event.preventDefault();
        lockRotation(lastDraggedTokenId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lastDraggedTokenId, lockRotation, rotateTokenBy]);

  return (
    <div
      ref={boardRef}
      className={classNames(
        'campaign-map-board',
        className,
        interactionDisabled && 'campaign-map-board--disabled'
      )}
    >
      {title && <h5 className="campaign-map-board__title">{title}</h5>}
      {imageSrc ? (
        <div className="campaign-map-board__stage">
          <div className="campaign-map-board__image-wrapper">
            <img src={imageSrc} alt={altText} className="campaign-map-board__image" />
            <div className="campaign-map-board__grid-overlay" aria-hidden="true" />
            <div
              className="campaign-map-board__tokens-layer"
              ref={handleLayerRef}
              onPointerDown={handleLayerPointerDown}
            >
              {tokenPositions.map((token, tokenIndex) => {
                const {
                  characterId,
                  position,
                  color,
                  label,
                  currentHp,
                  maxHp,
                  variant,
                  isActiveTurn,
                  size,
                } = token;
                const draggable = !interactionDisabled && token.isMovable !== false;
                const normalizedLabel = normalizeText(label);
                const displayLabel = normalizedLabel || normalizeText(characterId) || characterId;
                const isLabelActive = activeLabelTokenId === characterId;
                const numericCurrentHp = toFiniteNumberOrNull(currentHp);
                const numericMaxHp = toFiniteNumberOrNull(maxHp);
                const hasHealth =
                  numericCurrentHp !== null && numericMaxHp !== null && numericMaxHp > 0;
                const safeCurrentHp = hasHealth ? Math.max(0, numericCurrentHp) : null;
                const safeMaxHp = hasHealth ? Math.max(0, numericMaxHp) : null;
                const ratio =
                  hasHealth && safeMaxHp && safeMaxHp > 0
                    ? Math.min(1, Math.max(0, safeCurrentHp / safeMaxHp))
                    : 0;
                const fillPercent = Math.round(ratio * 10000) / 100;
                const healthColor = getHealthColor(ratio);
                const normalizedVariant =
                  typeof variant === 'string' && variant.trim() !== ''
                    ? variant.trim().toLowerCase()
                    : null;

                const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(token);
                const hasFigurineImage = Boolean(figurineImageUrl);
                const figurineMetricKey = figurineImageUrl || characterId || `token-${tokenIndex}`;
                const metrics = figurineMetricKey ? figurineImageMetrics[figurineMetricKey] : null;
                const imageFootprint = hasFigurineImage
                  ? resolveFigurineSquaresFromImageSize(metrics, metadataSquareSize)
                  : null;
                const sizeKey = resolveFigurineSizeKey(size);
                const baseFigurineScale =
                  FIGURINE_SIZE_MULTIPLIERS[sizeKey] ?? DEFAULT_FIGURINE_GRID_SQUARES;
                const figurineScale = Number.isFinite(imageFootprint)
                  ? imageFootprint
                  : Number.isFinite(baseFigurineScale)
                    ? baseFigurineScale
                    : DEFAULT_FIGURINE_GRID_SQUARES;

                const figurineColor =
                  normalizedVariant === 'enemy'
                    ? ENEMY_FIGURINE_COLOR
                    : normalizeText(color) || undefined;
                const resolvedRotation = getResolvedRotationForToken(token);
                const rotationValue = Number.isFinite(resolvedRotation)
                  ? resolvedRotation
                  : 0;
                const rotationDisplay = Math.round(rotationValue * 10) / 10;
                const rotationStyleValue = `${rotationValue}deg`;
                const storedHandleAngle = rotationHandleAngles[characterId];
                const fallbackHandleAngle = normalizeDegrees(rotationValue + 90);
                const effectiveHandleAngle = Number.isFinite(storedHandleAngle)
                  ? storedHandleAngle
                  : fallbackHandleAngle;
                const rotationHandleStyleValue = `${effectiveHandleAngle}deg`;
                const isRotationActive = lastDraggedTokenId === characterId;
                const isRotationDragging = draggingRotationTokenId === characterId;

                const labelClassName = classNames(
                  'campaign-map-board__figurine-label',
                  normalizedVariant ? `campaign-map-board__figurine-label--${normalizedVariant}` : null
                );

                return (
                  <div
                    key={characterId}
                    role={draggable ? 'button' : undefined}
                    tabIndex={draggable ? 0 : -1}
                    aria-label={displayLabel}
                    className={classNames(
                      'campaign-map-board__token',
                      draggable && 'campaign-map-board__token--draggable',
                      isLabelActive && 'campaign-map-board__token--label-active',
                      isActiveTurn && 'campaign-map-board__token--active-turn',
                      `campaign-map-board__token--size-${sizeKey}`,
                      isRotationActive && 'lastDragged',
                      isRotationDragging && 'campaign-map-board__token--rotation-active'
                    )}
                    style={{
                      left: `${(position?.x ?? 0) * 100}%`,
                      top: `${(position?.y ?? 0) * 100}%`,
                      '--figurine-size-scale': figurineScale,
                      '--figurine-rotation': rotationStyleValue,
                      '--rotation-handle-angle': rotationHandleStyleValue,
                    }}
                    title={displayLabel || undefined}
                    onPointerDown={(event) => {
                      if (characterId) {
                        setActiveLabelTokenId(characterId);
                      }
                      handlePointerDown(event, token);
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(event) => {
                      setActiveLabelTokenId((prev) =>
                        prev === characterId ? null : prev
                      );
                      handlePointerUp(event);
                    }}
                    onPointerCancel={(event) => {
                      setActiveLabelTokenId((prev) =>
                        prev === characterId ? null : prev
                      );
                      handlePointerCancel(event);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (
                        interactionDisabled ||
                        typeof onTokenRemove !== 'function' ||
                        !characterId
                      ) {
                        return;
                      }

                      onTokenRemove({
                        characterId,
                        token,
                        mapId:
                          typeof safeMap?.mapId === 'string' && safeMap.mapId.trim() !== ''
                            ? safeMap.mapId.trim()
                            : null,
                      });
                    }}
                    data-token-id={characterId}
                    data-rotation={rotationValue}
                  >
                    {displayLabel && (
                      <span className={labelClassName} aria-hidden="true">
                        {displayLabel}
                      </span>
                    )}
                    {isActiveTurn && (
                      <span className="campaign-map-board__turn-indicator">
                        <span aria-hidden="true">!</span>
                        <span className="visually-hidden">
                          {`${displayLabel || 'This character'} is taking their turn`}
                        </span>
                      </span>
                    )}
                    {hasHealth && safeCurrentHp !== null && safeMaxHp !== null && safeMaxHp > 0 && (
                      <div
                        className="campaign-map-board__health"
                        style={{ '--campaign-map-board-health-color': healthColor }}
                      >
                        <span className="visually-hidden">{`HP: ${formatHpValue(
                          safeCurrentHp
                        )}/${formatHpValue(safeMaxHp)}`}</span>
                        <div className="campaign-map-board__health-track">
                          <div
                            className="campaign-map-board__health-fill"
                            style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div
                      className={classNames(
                        'campaign-map-board__figurine',
                        draggable && 'campaign-map-board__figurine--active',
                        isActiveTurn && 'campaign-map-board__figurine--active-turn',
                        hasFigurineImage && 'campaign-map-board__figurine--has-image'
                      )}
                      style={{ '--figurine-color': figurineColor }}
                    >
                      {hasFigurineImage && (
                        <span className="campaign-map-board__figurine-image-wrapper" aria-hidden="true">
                          <img
                            src={figurineImageUrl}
                            alt=""
                            className="campaign-map-board__figurine-image"
                            data-figurine-public-id={figurineImagePublicId || undefined}
                            loading="lazy"
                            onLoad={(event) =>
                              handleFigurineImageLoad(
                                figurineMetricKey,
                                event?.currentTarget || event?.target || null
                              )
                            }
                          />
                        </span>
                      )}
                      <span className="campaign-map-board__figurine-figure" aria-hidden="true">
                        <span className="campaign-map-board__figurine-head" />
                        <span className="campaign-map-board__figurine-torso" />
                        <span className="campaign-map-board__figurine-cloak" />
                      </span>
                    </div>
                    {isRotationActive && (
                      <div
                        className="campaign-map-board__rotation-controls"
                        style={{ '--rotation-handle-angle': rotationHandleStyleValue }}
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerMove={(event) => event.stopPropagation()}
                        onPointerUp={(event) => event.stopPropagation()}
                      >
                        <div className="campaign-map-board__rotation-handle-track">
                          <button
                            type="button"
                            className="campaign-map-board__rotation-handle"
                            aria-label={
                              Number.isFinite(rotationDisplay)
                                ? `Rotate figurine (current ${rotationDisplay}°)`
                                : 'Rotate figurine'
                            }
                            onPointerDown={(event) =>
                              handleRotationHandlePointerDown(event, characterId, rotationValue)
                            }
                            onFocus={() => setLastDraggedTokenId(characterId)}
                            onBlur={() =>
                              setLastDraggedTokenId((prev) => (prev === characterId ? null : prev))
                            }
                          >
                            <span
                              aria-hidden="true"
                              className="campaign-map-board__rotation-handle-icon"
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {children}
        </div>
      ) : (
        <p className="text-muted mb-0">No map image available.</p>
      )}
    </div>
  );
};

CampaignMapBoard.propTypes = {
  map: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  tokens: PropTypes.arrayOf(
    PropTypes.shape({
      characterId: PropTypes.string.isRequired,
      x: PropTypes.number,
      y: PropTypes.number,
      color: PropTypes.string,
      label: PropTypes.string,
      variant: PropTypes.oneOf(['enemy', 'ally', 'self']),
      isMovable: PropTypes.bool,
      currentHp: PropTypes.number,
      maxHp: PropTypes.number,
      isActiveTurn: PropTypes.bool,
      size: PropTypes.string,
      figurineImageUrl: PropTypes.string,
      figurineImagePublicId: PropTypes.string,
      rotation: PropTypes.number,
    })
  ),
  onTokenDragStart: PropTypes.func,
  onTokenDrag: PropTypes.func,
  onTokenDragEnd: PropTypes.func,
  onTokenPositionChange: PropTypes.func,
  onBackgroundClick: PropTypes.func,
  onTokenRemove: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

CampaignMapBoard.defaultProps = {
  map: null,
  tokens: [],
  onTokenDragStart: null,
  onTokenDrag: null,
  onTokenDragEnd: null,
  onTokenPositionChange: null,
  onBackgroundClick: null,
  onTokenRemove: null,
  disabled: false,
  className: '',
  children: null,
};

export default CampaignMapBoard;
