import React, { useRef, useState, useMemo, useCallback } from 'react';
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
  tiny: 0.25,
  small: 0.5,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
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

  const layerRef = useRef(null);
  const dragStateRef = useRef({ tokenId: null, pointerId: null });
  const [dragPositions, setDragPositions] = useState({});
  const [activeLabelTokenId, setActiveLabelTokenId] = useState(null);
  const handleLayerRef = useCallback((node) => {
    layerRef.current = node;
  }, []);

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
      if (pointerId !== undefined && event.pointerId !== pointerId) {
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

  return (
    <div className={classNames('campaign-map-board', className, interactionDisabled && 'campaign-map-board--disabled')}>
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
              {tokenPositions.map((token) => {
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

                const sizeKey = resolveFigurineSizeKey(size);
                const baseFigurineScale =
                  FIGURINE_SIZE_MULTIPLIERS[sizeKey] ?? FIGURINE_SIZE_MULTIPLIERS.medium;
                const scaleMultiplier = normalizedVariant === 'enemy' ? 0.75 : 1;
                const figurineScale = Number.isFinite(baseFigurineScale)
                  ? baseFigurineScale * scaleMultiplier
                  : FIGURINE_SIZE_MULTIPLIERS.medium * scaleMultiplier;

                const figurineColor =
                  normalizedVariant === 'enemy'
                    ? ENEMY_FIGURINE_COLOR
                    : normalizeText(color) || undefined;

                const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(token);
                const hasFigurineImage = Boolean(figurineImageUrl);

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
                      `campaign-map-board__token--size-${sizeKey}`
                    )}
                    style={{
                      left: `${(position?.x ?? 0) * 100}%`,
                      top: `${(position?.y ?? 0) * 100}%`,
                      '--figurine-size-scale': figurineScale,
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
                  >
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
                          />
                        </span>
                      )}
                      <span className="campaign-map-board__figurine-figure" aria-hidden="true">
                        <span className="campaign-map-board__figurine-head" />
                        <span className="campaign-map-board__figurine-torso" />
                        <span className="campaign-map-board__figurine-cloak" />
                      </span>
                    </div>
                    {displayLabel && (
                      <span className={labelClassName} aria-hidden="true">
                        {displayLabel}
                      </span>
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
