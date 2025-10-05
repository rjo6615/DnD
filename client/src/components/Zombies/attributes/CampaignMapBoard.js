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

const ROTATION_STEP_DEGREES = 15;

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
  const [lastDraggedTokenId, setLastDraggedTokenId] = useState(null);
  const [rotationOverrides, setRotationOverrides] = useState({});
  const rotationOverridesRef = useRef({});
  const tokenPositionsRef = useRef([]);
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

  const rotateTokenBy = useCallback(
    (tokenId, delta) => {
      if (!tokenId || !Number.isFinite(delta)) {
        return;
      }

      const tokensList = tokenPositionsRef.current;
      const overrides = rotationOverridesRef.current || {};
      const currentOverride = overrides[tokenId];
      let baseRotation = Number.isFinite(currentOverride)
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

      setRotationOverrides((prev) => {
        if (prev[tokenId] === nextRotation) {
          return prev;
        }

        return {
          ...prev,
          [tokenId]: nextRotation,
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
              rotation: nextRotation,
            });
          }
        }
      }
    },
    [onTokenPositionChange]
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
                const resolvedRotation = getResolvedRotationForToken(token);
                const rotationValue = Number.isFinite(resolvedRotation)
                  ? resolvedRotation
                  : 0;
                const rotationDisplay = Math.round(rotationValue * 10) / 10;
                const rotationStyleValue = `${rotationValue}deg`;
                const isRotationActive = lastDraggedTokenId === characterId;

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
                      isRotationActive && 'lastDragged'
                    )}
                    style={{
                      left: `${(position?.x ?? 0) * 100}%`,
                      top: `${(position?.y ?? 0) * 100}%`,
                      '--figurine-size-scale': figurineScale,
                      '--figurine-rotation': rotationStyleValue,
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
                        role="group"
                        aria-label="Figurine rotation controls"
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerUp={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="campaign-map-board__rotation-button"
                          onClick={(event) => {
                            event.preventDefault();
                            rotateTokenBy(characterId, -ROTATION_STEP_DEGREES);
                          }}
                          aria-label="Rotate counterclockwise"
                        >
                          <span aria-hidden="true">⟲</span>
                        </button>
                        <div className="campaign-map-board__rotation-angle" aria-live="polite">
                          {`${rotationDisplay}°`}
                        </div>
                        <button
                          type="button"
                          className="campaign-map-board__rotation-button"
                          onClick={(event) => {
                            event.preventDefault();
                            rotateTokenBy(characterId, ROTATION_STEP_DEGREES);
                          }}
                          aria-label="Rotate clockwise"
                        >
                          <span aria-hidden="true">⟳</span>
                        </button>
                        <button
                          type="button"
                          className="campaign-map-board__rotation-lock"
                          onClick={(event) => {
                            event.preventDefault();
                            lockRotation(characterId);
                          }}
                          aria-label="Lock rotation"
                        >
                          Lock
                        </button>
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
