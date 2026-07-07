import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from '../../../utils/classNames';
import { ENEMY_FIGURINE_COLOR } from '../constants/tokenAppearance';
import { resolveFigurineImageData } from '../utils/figurineAssets';
import resolveMapImageSource from '../utils/mapImages';
import clampMapZoom, { MAP_ZOOM_DEFAULT, MAP_ZOOM_MIN, MAP_ZOOM_MAX } from '../utils/mapZoom';
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

const ROTATION_HANDLE_DISTANCE_BASE_SCALE = 1.35;
const ROTATION_HANDLE_DISTANCE_MIN_SCALE = 1.05;
const ROTATION_HANDLE_DISTANCE_REDUCTION_PER_EXTRA_SCALE = 0.15;

const resolveRotationHandleDistanceScale = (figurineScale) => {
  if (!Number.isFinite(figurineScale) || figurineScale <= 0) {
    return ROTATION_HANDLE_DISTANCE_BASE_SCALE;
  }

  const extraScale = Math.max(0, figurineScale - 1);
  const reducedScale =
    ROTATION_HANDLE_DISTANCE_BASE_SCALE -
    ROTATION_HANDLE_DISTANCE_REDUCTION_PER_EXTRA_SCALE * extraScale;

  if (reducedScale < ROTATION_HANDLE_DISTANCE_MIN_SCALE) {
    return ROTATION_HANDLE_DISTANCE_MIN_SCALE;
  }

  if (reducedScale > ROTATION_HANDLE_DISTANCE_BASE_SCALE) {
    return ROTATION_HANDLE_DISTANCE_BASE_SCALE;
  }

  return reducedScale;
};

const DEFAULT_GRID_DIMENSION = 24;
const MAP_ZOOM_EPSILON = 0.0005;
const MAP_ZOOM_ANIMATION_TIME_CONSTANT_MS = 90;

const getTouchDistance = (touches) => {
  if (!touches || touches.length < 2) {
    return null;
  }

  const first = touches[0];
  const second = touches[1];
  const deltaX = Number(second.clientX) - Number(first.clientX);
  const deltaY = Number(second.clientY) - Number(first.clientY);
  const distance = Math.hypot(deltaX, deltaY);

  return Number.isFinite(distance) && distance > 0 ? distance : null;
};

const resolveElementScale = (element) => {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return { x: 1, y: 1 };
  }

  const rect = element.getBoundingClientRect();
  const layoutWidth = Number(element.offsetWidth) || Number(element.clientWidth);
  const layoutHeight = Number(element.offsetHeight) || Number(element.clientHeight);

  let scaleX = 1;
  let scaleY = 1;

  if (rect && Number.isFinite(rect.width) && rect.width > 0 && layoutWidth > 0) {
    scaleX = rect.width / layoutWidth;
  }

  if (rect && Number.isFinite(rect.height) && rect.height > 0 && layoutHeight > 0) {
    scaleY = rect.height / layoutHeight;
  }

  if (!Number.isFinite(scaleX) || scaleX <= 0) {
    scaleX = 1;
  }

  if (!Number.isFinite(scaleY) || scaleY <= 0) {
    scaleY = 1;
  }

  return { x: scaleX, y: scaleY };
};

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
          columns: Math.max(1, resolvedFirst),
          rows: Math.max(1, resolvedSecond ?? resolvedFirst),
        };
      }
    }

    return null;
  }

  const numericValue = parsePositiveNumber(value);
  if (numericValue !== null) {
    const safeValue = Math.max(1, numericValue);
    return { columns: safeValue, rows: safeValue };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const pairMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    if (pairMatch) {
      const [, columnMatch, rowMatch] = pairMatch;
      const parsedColumns = Number.parseFloat(columnMatch);
      const parsedRows = Number.parseFloat(rowMatch);
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

    const safeValue = Math.max(1, parsed);
    return current ?? safeValue;
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
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    return null;
  }

  if (maxDimension < FALLBACK_FIGURINE_PIXEL_SQUARE_SIZE) {
    return 1;
  }

  const squareSize = (() => {
    if (Number.isFinite(metadataSquareSize) && metadataSquareSize > 0) {
      if (metadataSquareSize >= FALLBACK_FIGURINE_PIXEL_SQUARE_SIZE) {
        return metadataSquareSize;
      }

      if (maxDimension >= FALLBACK_FIGURINE_PIXEL_SQUARE_SIZE) {
        return metadataSquareSize;
      }
    }

    return FALLBACK_FIGURINE_PIXEL_SQUARE_SIZE;
  })();

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

const MAP_PAN_DRAG_THRESHOLD_PX = 5;
const MAP_PAN_DRAG_THRESHOLD_SQUARED = MAP_PAN_DRAG_THRESHOLD_PX ** 2;

const resolvePointerValue = (primary, fallback) => {
  const primaryNumber = Number(primary);
  if (Number.isFinite(primaryNumber)) {
    return primaryNumber;
  }

  const fallbackNumber = Number(fallback);
  if (Number.isFinite(fallbackNumber)) {
    return fallbackNumber;
  }

  return null;
};

const resolvePointerCoordinates = (event) => ({
  x: resolvePointerValue(event?.clientX, event?.pageX),
  y: resolvePointerValue(event?.clientY, event?.pageY),
});

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
const degreesToRadians = (degrees) => (Number(degrees) * Math.PI) / 180;

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
  allowWheelZoom,
}) => {
  const pointerEventsSupported = usePointerEventsSupported();
  const safeMap = map && typeof map === 'object' ? map : {};
  const title = normalizeText(safeMap.title);
  const altText =
    normalizeText(safeMap.altText) ||
    title ||
    normalizeText(safeMap.prompt) ||
    'Campaign map image';
  const imageSrc = resolveMapImageSource(safeMap);

  const interactionDisabled = disabled || !imageSrc;

  const boardRef = useRef(null);
  const layerRef = useRef(null);
  const dragStateRef = useRef({ tokenId: null, pointerId: null });
  const [dragPositions, setDragPositions] = useState({});
  const [activeLabelTokenId, setActiveLabelTokenId] = useState(null);
  const [lastDraggedTokenId, setLastDraggedTokenId] = useState(null);
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  const [rotationOverrides, setRotationOverrides] = useState({});
  const rotationOverridesRef = useRef({});
  const [draggingRotationTokenId, setDraggingRotationTokenId] = useState(null);
  const [mapPanOffset, setMapPanOffset] = useState({ x: 0, y: 0 });
  const [mapImageMetrics, setMapImageMetrics] = useState(null);
  const mapPanOffsetRef = useRef(mapPanOffset);
  const mapPanStateRef = useRef(null);
  const [isMapPanning, setIsMapPanning] = useState(false);
  const tokenPositionsRef = useRef([]);
  const [layerNode, setLayerNode] = useState(null);
  const [figurineImageMetrics, setFigurineImageMetrics] = useState({});
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM_DEFAULT);
  const mapZoomRafRef = useRef(null);
  const mapZoomTargetRef = useRef(MAP_ZOOM_DEFAULT);
  const mapZoomAnimationStateRef = useRef({ lastTimestamp: null });
  const touchZoomStateRef = useRef(null);
  const gestureZoomStartRef = useRef(MAP_ZOOM_DEFAULT);
  const resolvedMapZoom = useMemo(() => clampMapZoom(mapZoom), [mapZoom]);
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
  const stageAspectRatio = useMemo(() => {
    const metricsWidth = Number(mapImageMetrics?.width);
    const metricsHeight = Number(mapImageMetrics?.height);

    if (Number.isFinite(metricsWidth) && Number.isFinite(metricsHeight)) {
      if (metricsWidth > 0 && metricsHeight > 0) {
        return `${metricsWidth} / ${metricsHeight}`;
      }
    }

    if (!Number.isFinite(gridColumns) || !Number.isFinite(gridRows)) {
      return null;
    }

    const safeColumns = Math.max(1, Number(gridColumns));
    const safeRows = Math.max(1, Number(gridRows));

    if (safeColumns <= 0 || safeRows <= 0) {
      return null;
    }

    return `${safeColumns} / ${safeRows}`;
  }, [gridColumns, gridRows, mapImageMetrics?.height, mapImageMetrics?.width]);
  const metadataSquareSize = useMemo(() => resolveSquareSizeFromMetadata(map), [map]);

  useEffect(() => {
    mapPanOffsetRef.current = mapPanOffset;
  }, [mapPanOffset]);

  useEffect(() => {
    if (mapZoomRafRef.current === null) {
      mapZoomTargetRef.current = mapZoom;
    }
  }, [mapZoom]);

  useEffect(() => {
    setMapImageMetrics(null);
  }, [imageSrc]);

  useEffect(() => {
    return () => {
      const cancelFrame =
        typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
          ? window.cancelAnimationFrame
          : null;

      if (cancelFrame && mapZoomRafRef.current !== null) {
        cancelFrame(mapZoomRafRef.current);
        mapZoomRafRef.current = null;
      }
      mapZoomAnimationStateRef.current.lastTimestamp = null;
    };
  }, []);

  const handleMapImageLoad = useCallback((event) => {
    const target = event?.target;
    if (!target) {
      return;
    }

    const nextWidth = Number(target.naturalWidth);
    const nextHeight = Number(target.naturalHeight);

    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
      return;
    }

    if (nextWidth <= 0 || nextHeight <= 0) {
      return;
    }

    setMapImageMetrics((prev) => {
      if (prev && prev.width === nextWidth && prev.height === nextHeight) {
        return prev;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const handleMapZoomAnimationFrame = useCallback(
    (timestamp) => {
      mapZoomRafRef.current = null;

      const state = mapZoomAnimationStateRef.current;
      const targetZoom = clampMapZoom(mapZoomTargetRef.current);

      if (!Number.isFinite(targetZoom)) {
        state.lastTimestamp = null;
        return;
      }

      const lastTimestamp = state.lastTimestamp ?? timestamp;
      const deltaMilliseconds = Math.max(0, timestamp - lastTimestamp);
      state.lastTimestamp = timestamp;

      let shouldContinue = false;

      setMapZoom((previous) => {
        const difference = targetZoom - previous;
        const differenceMagnitude = Math.abs(difference);

        if (differenceMagnitude <= MAP_ZOOM_EPSILON) {
          state.lastTimestamp = null;
          return targetZoom;
        }

        const clampedDeltaMs = Math.min(deltaMilliseconds, 200);
        const smoothingFactor = 1 - Math.exp(-clampedDeltaMs / MAP_ZOOM_ANIMATION_TIME_CONSTANT_MS);
        const easedNextZoom = clampMapZoom(previous + difference * smoothingFactor);

        if (Math.abs(targetZoom - easedNextZoom) <= MAP_ZOOM_EPSILON) {
          state.lastTimestamp = null;
          return targetZoom;
        }

        shouldContinue = true;
        return easedNextZoom;
      });

      if (shouldContinue) {
        const requestFrame =
          typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame
            : null;

        if (requestFrame) {
          mapZoomRafRef.current = requestFrame(handleMapZoomAnimationFrame);
        } else {
          mapZoomAnimationStateRef.current.lastTimestamp = null;
          setMapZoom(clampMapZoom(mapZoomTargetRef.current));
        }
      }
    },
    [setMapZoom]
  );

  const scheduleMapZoomUpdate = useCallback(
    (nextZoom) => {
      if (!Number.isFinite(nextZoom)) {
        return;
      }

      const clampedNextZoom = clampMapZoom(nextZoom);
      mapZoomTargetRef.current = clampedNextZoom;

      const requestFrame =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame
          : null;

      if (!requestFrame) {
        setMapZoom(clampedNextZoom);
        return;
      }

      if (mapZoomRafRef.current !== null) {
        return;
      }

      mapZoomAnimationStateRef.current.lastTimestamp = null;
      mapZoomRafRef.current = requestFrame(handleMapZoomAnimationFrame);
    },
    [handleMapZoomAnimationFrame, setMapZoom]
  );

  const applyMapZoomImmediately = useCallback((nextZoom) => {
    if (!Number.isFinite(nextZoom)) {
      return;
    }

    const clampedNextZoom = clampMapZoom(nextZoom);
    const cancelFrame =
      typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
        ? window.cancelAnimationFrame
        : null;

    if (cancelFrame && mapZoomRafRef.current !== null) {
      cancelFrame(mapZoomRafRef.current);
    }

    mapZoomRafRef.current = null;
    mapZoomAnimationStateRef.current.lastTimestamp = null;
    mapZoomTargetRef.current = clampedNextZoom;
    setMapZoom(clampedNextZoom);
  }, []);

  const panStyle = useMemo(() => {
    const style = {
      '--campaign-map-pan-x': `${mapPanOffset.x}px`,
      '--campaign-map-pan-y': `${mapPanOffset.y}px`,
    };

    if (stageAspectRatio) {
      style['--campaign-map-stage-aspect-ratio'] = stageAspectRatio;
    }

    return style;
  }, [mapPanOffset.x, mapPanOffset.y, stageAspectRatio]);

  useEffect(() => {
    mapPanStateRef.current = null;
    setIsMapPanning(false);
    setMapPanOffset((prev) => {
      if (prev.x === 0 && prev.y === 0) {
        return prev;
      }
      return { x: 0, y: 0 };
    });
    mapPanOffsetRef.current = { x: 0, y: 0 };
    const cancelFrame =
      typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
        ? window.cancelAnimationFrame
        : null;
    if (cancelFrame && mapZoomRafRef.current !== null) {
      cancelFrame(mapZoomRafRef.current);
      mapZoomRafRef.current = null;
    }
    mapZoomAnimationStateRef.current.lastTimestamp = null;
    mapZoomTargetRef.current = MAP_ZOOM_DEFAULT;
    setMapZoom(MAP_ZOOM_DEFAULT);
  }, [imageSrc]);

  useEffect(() => {
    if (!allowWheelZoom) {
      const cancelFrame =
        typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
          ? window.cancelAnimationFrame
          : null;
      if (cancelFrame && mapZoomRafRef.current !== null) {
        cancelFrame(mapZoomRafRef.current);
        mapZoomRafRef.current = null;
      }
      mapZoomAnimationStateRef.current.lastTimestamp = null;
      mapZoomTargetRef.current = MAP_ZOOM_DEFAULT;
      setMapZoom(MAP_ZOOM_DEFAULT);
    }
  }, [allowWheelZoom]);

  const boardStyle = useMemo(() => {
    const zoomValue = Number.isFinite(resolvedMapZoom) ? resolvedMapZoom : MAP_ZOOM_DEFAULT;
    const normalizedZoom = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, zoomValue));
    const gridLineWidth = Math.max(0.35, Math.min(0.75, 0.75 / normalizedZoom));

    const baseStyle = {
      '--campaign-map-grid-line-width': `${gridLineWidth}px`,
    };

    if (!allowWheelZoom) {
      return baseStyle;
    }

    return {
      ...baseStyle,
      '--campaign-map-zoom': `${zoomValue}`,
      '--map-modal-background-scale': `${zoomValue}`,
    };
  }, [allowWheelZoom, resolvedMapZoom]);

  const handleWheel = useCallback(
    (event) => {
      if (!allowWheelZoom) {
        return;
      }

      const wheelEvent = event?.nativeEvent ?? event;
      if (!wheelEvent || typeof wheelEvent.deltaY !== 'number' || wheelEvent.deltaY === 0) {
        return;
      }

      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }

      if (typeof event?.stopPropagation === 'function') {
        event.stopPropagation();
      }

      const { deltaY, ctrlKey, deltaMode } = wheelEvent;

      const deltaPixels = (() => {
        if (typeof deltaMode !== 'number') {
          return deltaY;
        }

        if (deltaMode === 1) {
          return deltaY * 16;
        }

        if (deltaMode === 2) {
          return deltaY * 800;
        }

        return deltaY;
      })();

      if (!Number.isFinite(deltaPixels) || deltaPixels === 0) {
        return;
      }

      const normalizedDelta = Math.max(-1, Math.min(1, deltaPixels / 120));
      const zoomStrength = ctrlKey ? 0.12 : 0.2;
      const zoomMultiplier = 1 - normalizedDelta * zoomStrength;

      if (!Number.isFinite(zoomMultiplier) || zoomMultiplier <= 0) {
        return;
      }

      const safePrevious = clampMapZoom(mapZoomTargetRef.current);
      const nextZoom = clampMapZoom(safePrevious * zoomMultiplier);
      scheduleMapZoomUpdate(nextZoom);
    },
    [allowWheelZoom, scheduleMapZoomUpdate]
  );


  const handleTouchStart = useCallback(
    (event) => {
      if (!allowWheelZoom) {
        return;
      }

      const touches = event?.touches;
      const distance = getTouchDistance(touches);
      if (distance === null) {
        touchZoomStateRef.current = null;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      touchZoomStateRef.current = {
        distance,
        zoom: clampMapZoom(mapZoomTargetRef.current),
      };
    },
    [allowWheelZoom]
  );

  const handleTouchMove = useCallback(
    (event) => {
      if (!allowWheelZoom) {
        return;
      }

      const distance = getTouchDistance(event?.touches);
      const state = touchZoomStateRef.current;
      if (distance === null || !state || !Number.isFinite(state.distance) || state.distance <= 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const nextZoom = clampMapZoom(state.zoom * (distance / state.distance));
      applyMapZoomImmediately(nextZoom);
    },
    [allowWheelZoom, applyMapZoomImmediately]
  );

  const handleTouchEnd = useCallback(() => {
    touchZoomStateRef.current = null;
  }, []);

  useEffect(() => {
    const boardElement = boardRef.current;

    if (!boardElement || !allowWheelZoom) {
      return () => {};
    }

    const preventNativePinchZoom = (event) => {
      if (event?.touches && event.touches.length >= 2) {
        event.preventDefault();
      }
    };

    const handleGestureStart = (event) => {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
      gestureZoomStartRef.current = clampMapZoom(mapZoomTargetRef.current);
    };

    const handleGestureChange = (event) => {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }

      const scale = Number(event?.scale);
      if (!Number.isFinite(scale) || scale <= 0) {
        return;
      }

      applyMapZoomImmediately(clampMapZoom(gestureZoomStartRef.current * scale));
    };

    boardElement.addEventListener('touchmove', preventNativePinchZoom, { passive: false });
    boardElement.addEventListener('gesturestart', handleGestureStart, { passive: false });
    boardElement.addEventListener('gesturechange', handleGestureChange, { passive: false });

    return () => {
      boardElement.removeEventListener('touchmove', preventNativePinchZoom);
      boardElement.removeEventListener('gesturestart', handleGestureStart);
      boardElement.removeEventListener('gesturechange', handleGestureChange);
    };
  }, [allowWheelZoom, applyMapZoomImmediately]);

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

    setLastDraggedTokenId((prev) => (prev && !activeIds.has(prev) ? null : prev));
    setHoveredTokenId((prev) => (prev && !activeIds.has(prev) ? null : prev));
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

      if (
        event.pointerId !== undefined &&
        event.currentTarget.setPointerCapture
      ) {
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
      setHoveredTokenId(null);
      if (interactionDisabled) {
        return;
      }

      if (event.target !== event.currentTarget) {
        return;
      }

      if (typeof event?.button === 'number' && event.button !== 0) {
        return;
      }

      const { x: startX, y: startY } = resolvePointerCoordinates(event);
      const resolvedStartX = Number.isFinite(startX) ? startX : 0;
      const resolvedStartY = Number.isFinite(startY) ? startY : 0;
      const initialCoords =
        Number.isFinite(startX) && Number.isFinite(startY)
          ? getNormalizedCoordinates(startX, startY)
          : null;

      const { x: scaleX, y: scaleY } = resolveElementScale(event.currentTarget);

      mapPanStateRef.current = {
        pointerId: event.pointerId,
        startClientX: resolvedStartX,
        startClientY: resolvedStartY,
        originX: mapPanOffsetRef.current.x,
        originY: mapPanOffsetRef.current.y,
        initialCoords: initialCoords || null,
        hasDragged: false,
        allowBackgroundClick: typeof onBackgroundClick === 'function',
        scaleX,
        scaleY,
        zoom: clampMapZoom(mapZoomTargetRef.current),
      };

      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore pointer capture errors (e.g., when unsupported)
        }
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [getNormalizedCoordinates, interactionDisabled, onBackgroundClick]
  );

  const handleLayerPointerMove = useCallback((event) => {
    const panState = mapPanStateRef.current;
    if (!panState) {
      return;
    }

    const { x: currentX, y: currentY } = resolvePointerCoordinates(event);
    if (!Number.isFinite(currentX) || !Number.isFinite(currentY)) {
      return;
    }

    if (
      panState.pointerId !== undefined &&
      event.pointerId !== undefined &&
      panState.pointerId !== event.pointerId
    ) {
      return;
    }

    const rawDeltaX = currentX - panState.startClientX;
    const rawDeltaY = currentY - panState.startClientY;

    if (!panState.hasDragged) {
      const distanceSquared = rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY;
      if (distanceSquared < MAP_PAN_DRAG_THRESHOLD_SQUARED) {
        return;
      }

      panState.hasDragged = true;
      setIsMapPanning(true);
    }

    event.preventDefault();
    event.stopPropagation();

    const panZoom = Number.isFinite(panState.zoom) && panState.zoom > 0 ? panState.zoom : 1;
    const scaleX =
      panState && Number.isFinite(panState.scaleX) && panState.scaleX > 0
        ? Math.max(0.001, panState.scaleX / panZoom)
        : 1;
    const scaleY =
      panState && Number.isFinite(panState.scaleY) && panState.scaleY > 0
        ? Math.max(0.001, panState.scaleY / panZoom)
        : 1;

    const deltaX = rawDeltaX / scaleX;
    const deltaY = rawDeltaY / scaleY;

    const nextX = panState.originX + deltaX;
    const nextY = panState.originY + deltaY;

    if (
      nextX === mapPanOffsetRef.current.x &&
      nextY === mapPanOffsetRef.current.y
    ) {
      return;
    }

    mapPanOffsetRef.current = { x: nextX, y: nextY };
    setMapPanOffset({ x: nextX, y: nextY });
  }, []);

  const handleLayerPointerUp = useCallback(
    (event) => {
      const panState = mapPanStateRef.current;
      if (!panState) {
        return;
      }

      if (
        panState.pointerId !== undefined &&
        event.pointerId !== undefined &&
        panState.pointerId !== event.pointerId
      ) {
        return;
      }

      if (
        event.pointerId !== undefined &&
        event.currentTarget.releasePointerCapture
      ) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore release errors – capturing might not be active or supported
        }
      }

      mapPanStateRef.current = null;
      mapPanOffsetRef.current = mapPanOffset;
      setIsMapPanning(false);

      if (panState.hasDragged) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!panState.allowBackgroundClick) {
        return;
      }

      const { x: upX, y: upY } = resolvePointerCoordinates(event);
      const resolvedClientX = Number.isFinite(upX) ? upX : panState.startClientX;
      const resolvedClientY = Number.isFinite(upY) ? upY : panState.startClientY;
      const coords =
        getNormalizedCoordinates(resolvedClientX, resolvedClientY) ||
        panState.initialCoords;
      if (!coords) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onBackgroundClick(coords);
    },
    [getNormalizedCoordinates, mapPanOffset, onBackgroundClick]
  );

  const handleLayerPointerCancel = useCallback(
    (event) => {
      const panState = mapPanStateRef.current;
      if (!panState) {
        return;
      }

      if (
        panState.pointerId !== undefined &&
        event.pointerId !== undefined &&
        panState.pointerId !== event.pointerId
      ) {
        return;
      }

      if (
        event.pointerId !== undefined &&
        event.currentTarget.releasePointerCapture
      ) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore release errors – capturing might not be active or supported
        }
      }

      mapPanStateRef.current = null;
      setIsMapPanning(false);
    },
    []
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
          if (typeof rotationMoveHandlerRef.current === 'function') {
            target.removeEventListener('pointermove', rotationMoveHandlerRef.current);
          } else {
            const handlers = rotationMoveHandlerRef.current;
            if (handlers?.mouse) {
              target.removeEventListener('mousemove', handlers.mouse);
            }
            if (handlers?.touch) {
              target.removeEventListener('touchmove', handlers.touch);
            }
          }
        }
      });
      rotationMoveHandlerRef.current = null;
    }

    if (rotationUpHandlerRef.current) {
      targets.forEach((target) => {
        if (target && typeof target.removeEventListener === 'function') {
          if (typeof rotationUpHandlerRef.current === 'function') {
            target.removeEventListener('pointerup', rotationUpHandlerRef.current);
          } else {
            const handlers = rotationUpHandlerRef.current;
            if (handlers?.mouse) {
              target.removeEventListener('mouseup', handlers.mouse);
            }
            if (handlers?.touch) {
              target.removeEventListener('touchend', handlers.touch);
            }
          }
        }
      });
      rotationUpHandlerRef.current = null;
    }

    if (rotationCancelHandlerRef.current) {
      targets.forEach((target) => {
        if (target && typeof target.removeEventListener === 'function') {
          if (typeof rotationCancelHandlerRef.current === 'function') {
            target.removeEventListener('pointercancel', rotationCancelHandlerRef.current);
          } else {
            const handlers = rotationCancelHandlerRef.current;
            if (handlers?.mouse) {
              target.removeEventListener('mouseleave', handlers.mouse);
              target.removeEventListener('mouseout', handlers.mouse);
            }
            if (handlers?.touch) {
              target.removeEventListener('touchcancel', handlers.touch);
            }
          }
        }
      });
      rotationCancelHandlerRef.current = null;
    }

    rotationDragStateRef.current = null;
    setDraggingRotationTokenId(null);
  }, [pointerEventsSupported, setDraggingRotationTokenId]);

  useEffect(() => () => stopRotationDrag(), [stopRotationDrag]);

  useEffect(() => {
    if (interactionDisabled) {
      stopRotationDrag();
    }
  }, [interactionDisabled, stopRotationDrag]);

  const previewTokenRotation = useCallback(
    (tokenId, rotation) => {
      if (!tokenId || !Number.isFinite(rotation)) {
        return;
      }

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
    },
    []
  );


  const applyTokenRotation = useCallback(
    (tokenId, rotation) => {
      if (!tokenId || !Number.isFinite(rotation)) {
        return;
      }

      previewTokenRotation(tokenId, rotation);

      const tokensList = tokenPositionsRef.current;
      const normalizedRotation = normalizeDegrees(rotation);

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
    [onTokenPositionChange, previewTokenRotation]
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

      if (typeof event?.stopPropagation === 'function') {
        event.stopPropagation();
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
      const normalizedCurrent = normalizeDegrees(currentRotation);
      const initialHandleAngle = normalizeDegrees(normalizedCurrent + 90);

      if (tokenElement.style && typeof tokenElement.style.setProperty === 'function') {
        tokenElement.style.setProperty('--figurine-rotation', `${normalizedCurrent}deg`);
        tokenElement.style.setProperty('--rotation-handle-angle', `${initialHandleAngle}deg`);
      }

      stopRotationDrag();

      setDraggingRotationTokenId(tokenId);
      setHoveredTokenId(tokenId);

      rotationDragStateRef.current = {
        tokenId,
        pointerId: event.pointerId,
        pointerType: event.pointerType || null,
        centerX,
        centerY,
        tokenElement,
        baseRotationDegrees: normalizedCurrent,
        initialPointerAngle: pointerAngle,
        lastPointerAngle: pointerAngle,
        unwrappedPointerAngle: pointerAngle,
        pendingRotationDegrees: normalizedCurrent,
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

        const { pendingRotationDegrees, baseRotationDegrees } = dragState;

        const rotationToCommit = Number.isFinite(pendingRotationDegrees)
          ? pendingRotationDegrees
          : Number.isFinite(baseRotationDegrees)
            ? baseRotationDegrees
            : normalizedCurrent;

        applyTokenRotation(tokenId, rotationToCommit);

        if (dragState.tokenElement && typeof dragState.tokenElement.getBoundingClientRect === 'function') {
          const rect = dragState.tokenElement.getBoundingClientRect();
          if (
            rect &&
            Number.isFinite(rect.left) &&
            Number.isFinite(rect.top) &&
            Number.isFinite(rect.right) &&
            Number.isFinite(rect.bottom)
          ) {
            const isPointerInside =
              releaseEvent.clientX >= rect.left &&
              releaseEvent.clientX <= rect.right &&
              releaseEvent.clientY >= rect.top &&
              releaseEvent.clientY <= rect.bottom;

            setHoveredTokenId((prev) => {
              if (isPointerInside) {
                return tokenId;
              }
              return prev === tokenId ? null : prev;
            });
          }
        }

        releaseEvent.preventDefault();
        releaseEvent.stopPropagation();
        stopRotationDrag();
      };

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

        const pointerType = dragState.pointerType;
        if (
          pointerType &&
          (pointerType === 'mouse' || pointerType === 'pen') &&
          typeof moveEvent.buttons === 'number' &&
          (moveEvent.buttons & 1) === 0
        ) {
          handleRelease(moveEvent);
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
        const handleAngle = normalizeDegrees(nextRotation + 90);

        if (
          dragState.tokenElement &&
          dragState.tokenElement.style &&
          typeof dragState.tokenElement.style.setProperty === 'function'
        ) {
          dragState.tokenElement.style.setProperty('--figurine-rotation', `${nextRotation}deg`);
          dragState.tokenElement.style.setProperty('--rotation-handle-angle', `${handleAngle}deg`);
        }

        dragState.pendingRotationDegrees = nextRotation;

        previewTokenRotation(tokenId, nextRotation);
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

        if (dragState && Number.isFinite(dragState.baseRotationDegrees)) {
          previewTokenRotation(tokenId, dragState.baseRotationDegrees);
        }

        setHoveredTokenId((prev) => (prev === tokenId ? null : prev));
        stopRotationDrag();
      };

      const usePointerEventListeners =
        pointerEventsSupported ||
        (typeof event?.type === 'string' && event.type.startsWith('pointer'));

      if (usePointerEventListeners) {
        rotationMoveHandlerRef.current = handleMove;
        rotationUpHandlerRef.current = handleRelease;
        rotationCancelHandlerRef.current = handleCancel;
      } else {
        rotationMoveHandlerRef.current = {
          mouse: (ev) => handleMove(enhanceMouseEvent(ev)),
          touch: (ev) => handleMove(enhanceTouchEvent(ev)),
        };
        rotationUpHandlerRef.current = {
          mouse: (ev) => handleRelease(enhanceMouseEvent(ev)),
          touch: (ev) => handleRelease(enhanceTouchEvent(ev)),
        };
        rotationCancelHandlerRef.current = {
          mouse: (ev) => handleCancel(enhanceMouseEvent(ev)),
          touch: (ev) => handleCancel(enhanceTouchEvent(ev)),
        };
      }

      const targets = [];
      if (typeof window !== 'undefined') {
        targets.push(window);
      }
      if (typeof document !== 'undefined') {
        targets.push(document);
      }

      targets.forEach((target) => {
        if (target && typeof target.addEventListener === 'function') {
          if (usePointerEventListeners) {
            target.addEventListener('pointermove', handleMove, { passive: false });
            target.addEventListener('pointerup', handleRelease, { passive: false });
            target.addEventListener('pointercancel', handleCancel, { passive: false });
          } else {
            const moveHandlers = rotationMoveHandlerRef.current;
            const upHandlers = rotationUpHandlerRef.current;
            const cancelHandlers = rotationCancelHandlerRef.current;

            if (moveHandlers?.mouse) {
              target.addEventListener('mousemove', moveHandlers.mouse, {
                passive: false,
              });
            }
            if (moveHandlers?.touch) {
              target.addEventListener('touchmove', moveHandlers.touch, {
                passive: false,
              });
            }

            if (upHandlers?.mouse) {
              target.addEventListener('mouseup', upHandlers.mouse, {
                passive: false,
              });
            }
            if (upHandlers?.touch) {
              target.addEventListener('touchend', upHandlers.touch, {
                passive: false,
              });
            }

            if (cancelHandlers?.mouse) {
              target.addEventListener('mouseleave', cancelHandlers.mouse, {
                passive: false,
              });
              target.addEventListener('mouseout', cancelHandlers.mouse, {
                passive: false,
              });
            }
            if (cancelHandlers?.touch) {
              target.addEventListener('touchcancel', cancelHandlers.touch, {
                passive: false,
              });
            }
          }
        }
      });

      setLastDraggedTokenId(tokenId);

      event.preventDefault();
      event.stopPropagation();
    },
    [
      applyTokenRotation,
      interactionDisabled,
      pointerEventsSupported,
      previewTokenRotation,
      setDraggingRotationTokenId,
      setHoveredTokenId,
      stopRotationDrag,
    ]
  );

  const lockRotation = useCallback((tokenId) => {
    if (!tokenId) {
      setLastDraggedTokenId(null);
      return;
    }

    setLastDraggedTokenId(tokenId);
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
      style={boardStyle}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {title && <h5 className="campaign-map-board__title">{title}</h5>}
      {imageSrc ? (
        <div
          className={classNames(
            'campaign-map-board__stage',
            isMapPanning && 'campaign-map-board__stage--panning'
          )}
          style={panStyle}
        >
          <div className="campaign-map-board__image-wrapper">
            <img
              src={imageSrc}
              alt={altText}
              className="campaign-map-board__image"
              onLoad={handleMapImageLoad}
            />
            <div className="campaign-map-board__grid-overlay" aria-hidden="true" />
            <div
              className={classNames(
                'campaign-map-board__tokens-layer',
                isMapPanning && 'campaign-map-board__tokens-layer--panning'
              )}
              ref={handleLayerRef}
              onPointerDown={handleLayerPointerDown}
              onPointerMove={handleLayerPointerMove}
              onPointerUp={handleLayerPointerUp}
              onPointerCancel={handleLayerPointerCancel}
              onMouseDown={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerDown(enhanceMouseEvent(event));
              }}
              onMouseMove={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerMove(enhanceMouseEvent(event));
              }}
              onMouseUp={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerUp(enhanceMouseEvent(event));
              }}
              onMouseLeave={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerCancel(enhanceMouseEvent(event));
              }}
              onTouchStart={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerDown(enhanceTouchEvent(event));
              }}
              onTouchMove={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerMove(enhanceTouchEvent(event));
              }}
              onTouchEnd={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerUp(enhanceTouchEvent(event));
              }}
              onTouchCancel={(event) => {
                if (pointerEventsSupported) {
                  return;
                }
                handleLayerPointerCancel(enhanceTouchEvent(event));
              }}
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
                const hasMetadataSquareSize =
                  Number.isFinite(metadataSquareSize) && metadataSquareSize > 0;
                const imageFootprint =
                  hasFigurineImage && hasMetadataSquareSize
                    ? resolveFigurineSquaresFromImageSize(metrics, metadataSquareSize)
                    : null;
                const sizeKey = resolveFigurineSizeKey(size);
                const hasExplicitSize = typeof size === 'string' && size.trim() !== '';
                const baseFigurineScale =
                  FIGURINE_SIZE_MULTIPLIERS[sizeKey] ?? DEFAULT_FIGURINE_GRID_SQUARES;
                const figurineScale = (() => {
                  if (!hasExplicitSize && Number.isFinite(imageFootprint) && imageFootprint > 0) {
                    return imageFootprint;
                  }

                  if (Number.isFinite(baseFigurineScale) && baseFigurineScale > 0) {
                    return baseFigurineScale;
                  }

                  if (sizeKey === 'medium') {
                    return 1;
                  }

                  return DEFAULT_FIGURINE_GRID_SQUARES;
                })();
                const rotationHandleDistanceScale =
                  resolveRotationHandleDistanceScale(figurineScale);

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
                const rotationHandleStyleValue = `${normalizeDegrees(rotationValue + 90)}deg`;
                const isRotationActive = lastDraggedTokenId === characterId;
                const isRotationHovered = hoveredTokenId === characterId;
                const isRotationDragging = draggingRotationTokenId === characterId;
                const isRotationVisible =
                  isRotationActive || isRotationHovered || isRotationDragging;

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
                      hoveredTokenId === characterId &&
                        'campaign-map-board__token--hovered',
                      isActiveTurn && 'campaign-map-board__token--active-turn',
                      `campaign-map-board__token--size-${sizeKey}`,
                      isRotationActive && 'lastDragged',
                      isRotationVisible && 'campaign-map-board__token--rotation-visible',
                      isRotationDragging && 'campaign-map-board__token--rotation-active'
                    )}
                    style={{
                      left: `${(position?.x ?? 0) * 100}%`,
                      top: `${(position?.y ?? 0) * 100}%`,
                      '--figurine-size-scale': figurineScale,
                      '--figurine-rotation': rotationStyleValue,
                      '--rotation-handle-distance-scale': rotationHandleDistanceScale,
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
                    onPointerOver={() => {
                      if (!interactionDisabled && characterId) {
                        setHoveredTokenId(characterId);
                        setLastDraggedTokenId((prev) =>
                          prev && prev !== characterId ? null : prev
                        );
                      }
                    }}
                    onPointerEnter={() => {
                      if (!interactionDisabled && characterId) {
                        setHoveredTokenId(characterId);
                        setLastDraggedTokenId((prev) =>
                          prev && prev !== characterId ? null : prev
                        );
                      }
                    }}
                    onPointerLeave={(event) => {
                      if (
                        draggingRotationTokenId === characterId ||
                        (event?.relatedTarget?.nodeType &&
                          event.currentTarget &&
                          event.currentTarget.contains(event.relatedTarget))
                      ) {
                        return;
                      }
                      setHoveredTokenId((prev) => (prev === characterId ? null : prev));
                    }}
                    onMouseDown={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      const adapted = enhanceMouseEvent(event);
                      if (characterId) {
                        setActiveLabelTokenId(characterId);
                      }
                      handlePointerDown(adapted, token);
                    }}
                    onMouseMove={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      handlePointerMove(enhanceMouseEvent(event));
                    }}
                    onMouseUp={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      const adapted = enhanceMouseEvent(event);
                      setActiveLabelTokenId((prev) =>
                        prev === characterId ? null : prev
                      );
                      handlePointerUp(adapted);
                    }}
                    onMouseLeave={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      if (
                        draggingRotationTokenId === characterId ||
                        (event?.relatedTarget?.nodeType &&
                          event.currentTarget &&
                          event.currentTarget.contains(event.relatedTarget))
                      ) {
                        return;
                      }
                      setHoveredTokenId((prev) => (prev === characterId ? null : prev));
                      handlePointerCancel(enhanceMouseEvent(event));
                    }}
                    onMouseOver={() => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      if (!interactionDisabled && characterId) {
                        setHoveredTokenId(characterId);
                        setLastDraggedTokenId((prev) =>
                          prev && prev !== characterId ? null : prev
                        );
                      }
                    }}
                    onMouseEnter={() => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      if (!interactionDisabled && characterId) {
                        setHoveredTokenId(characterId);
                        setLastDraggedTokenId((prev) =>
                          prev && prev !== characterId ? null : prev
                        );
                      }
                    }}
                    onTouchStart={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      const adapted = enhanceTouchEvent(event);
                      if (characterId) {
                        setActiveLabelTokenId(characterId);
                        setHoveredTokenId(characterId);
                      }
                      handlePointerDown(adapted, token);
                    }}
                    onTouchMove={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      handlePointerMove(enhanceTouchEvent(event));
                    }}
                    onTouchEnd={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      const adapted = enhanceTouchEvent(event);
                      setActiveLabelTokenId((prev) =>
                        prev === characterId ? null : prev
                      );
                      setHoveredTokenId((prev) => (prev === characterId ? null : prev));
                      handlePointerUp(adapted);
                    }}
                    onTouchCancel={(event) => {
                      if (pointerEventsSupported) {
                        return;
                      }
                      const adapted = enhanceTouchEvent(event);
                      setActiveLabelTokenId((prev) =>
                        prev === characterId ? null : prev
                      );
                      setHoveredTokenId((prev) => (prev === characterId ? null : prev));
                      handlePointerCancel(adapted);
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
                    <div className="campaign-map-board__token-figure">
                      {hasHealth && safeCurrentHp !== null && safeMaxHp !== null && safeMaxHp > 0 && (
                        <div
                          className="campaign-map-board__health"
                          style={{ '--campaign-map-board-health-color': healthColor }}
                        >
                          <div className="campaign-map-board__health-content">
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
                        </div>
                      )}
                      <div className="campaign-map-board__figurine-rotation-wrapper">
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
                                className={
                                  figurineImageUrl.includes("Scale300")
                                  || figurineImageUrl.includes("x33_01")
                                  || figurineImageUrl.includes("x18_01")
                                  ?"campaign-map-board__figurine-image__scale-up-300"
                                  :figurineImageUrl.includes("Scale133")
                                  ?"campaign-map-board__figurine-image__scale-up-133"
                                  :figurineImageUrl.includes("Scale150")
                                  ?"campaign-map-board__figurine-image__scale-up-150"
                                  :figurineImageUrl.includes("Scale166")
                                  ?"campaign-map-board__figurine-image__scale-up-166"
                                  :figurineImageUrl.includes("Scale200")
                                  ?"campaign-map-board__figurine-image__scale-up-200"
                                  :figurineImageUrl.includes("Scale233")
                                  ?"campaign-map-board__figurine-image__scale-up-233"
                                  :figurineImageUrl.includes("Scale333")
                                  ?"campaign-map-board__figurine-image__scale-up-333"
                                  :"campaign-map-board__figurine-image"
                                }
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
                      </div>
                    </div>
                    {isRotationVisible && (
                      <div
                        className="campaign-map-board__rotation-controls"
                        style={{ '--rotation-handle-angle': rotationHandleStyleValue }}
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerMove={(event) => {
                          if (!isRotationDragging) {
                            event.stopPropagation();
                          }
                        }}
                        onPointerUp={(event) => {
                          if (!isRotationDragging) {
                            event.stopPropagation();
                          }
                        }}
                        onMouseDown={(event) => {
                          if (!pointerEventsSupported) {
                            event.stopPropagation();
                          }
                        }}
                        onMouseMove={(event) => {
                          if (!pointerEventsSupported && !isRotationDragging) {
                            event.stopPropagation();
                          }
                        }}
                        onMouseUp={(event) => {
                          if (!pointerEventsSupported && !isRotationDragging) {
                            event.stopPropagation();
                          }
                        }}
                        onTouchStart={(event) => {
                          if (!pointerEventsSupported) {
                            event.stopPropagation();
                          }
                        }}
                        onTouchMove={(event) => {
                          if (!pointerEventsSupported && !isRotationDragging) {
                            event.stopPropagation();
                          }
                        }}
                        onTouchEnd={(event) => {
                          if (!pointerEventsSupported && !isRotationDragging) {
                            event.stopPropagation();
                          }
                        }}
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
                            onPointerUp={(event) => {
                              event.stopPropagation();
                              lockRotation(characterId);
                            }}
                            onPointerCancel={(event) => {
                              event.stopPropagation();
                              stopRotationDrag();
                            }}
                            onFocus={() => setLastDraggedTokenId(characterId)}
                            onBlur={() =>
                              setLastDraggedTokenId((prev) => (prev === characterId ? null : prev))
                            }
                            onMouseDown={(event) => {
                              if (pointerEventsSupported) {
                                return;
                              }
                              handleRotationHandlePointerDown(
                                enhanceMouseEvent(event),
                                characterId,
                                rotationValue
                              );
                            }}
                            onMouseUp={(event) => {
                              if (pointerEventsSupported) {
                                return;
                              }
                              event.stopPropagation();
                              lockRotation(characterId);
                            }}
                            onMouseLeave={(event) => {
                              if (pointerEventsSupported) {
                                return;
                              }
                              event.stopPropagation();
                              stopRotationDrag();
                            }}
                            onTouchStart={(event) => {
                              if (pointerEventsSupported) {
                                return;
                              }
                              handleRotationHandlePointerDown(
                                enhanceTouchEvent(event),
                                characterId,
                                rotationValue
                              );
                            }}
                            onTouchEnd={(event) => {
                              if (pointerEventsSupported) {
                                return;
                              }
                              event.stopPropagation();
                              lockRotation(characterId);
                            }}
                            onTouchCancel={(event) => {
                              if (pointerEventsSupported) {
                                return;
                              }
                              event.stopPropagation();
                              stopRotationDrag();
                            }}
                          >
                            <svg
                              aria-hidden="true"
                              className="campaign-map-board__rotation-handle-icon"
                              viewBox="0 0 48 48"
                              focusable="false"
                            >
                              <path
                                d="M24 8A16 16 0 1 0 36.5 12.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M36.5 12.5H45V21"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M45 12.5 38 19.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M45 12.5 38 5.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
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
  allowWheelZoom: PropTypes.bool,
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
  allowWheelZoom: false,
};

export default CampaignMapBoard;
