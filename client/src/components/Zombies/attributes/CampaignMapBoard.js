import React, { useRef, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from '../../../utils/classNames';

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

const CampaignMapBoard = ({
  map,
  tokens,
  onTokenDragStart,
  onTokenDrag,
  onTokenDragEnd,
  onTokenPositionChange,
  onBackgroundClick,
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
      event.preventDefault();
      event.stopPropagation();
      finalizeDrag(event, false);
    },
    [finalizeDrag]
  );

  const handlePointerCancel = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      finalizeDrag(event, true);
    },
    [finalizeDrag]
  );

  const handleLayerPointerDown = useCallback(
    (event) => {
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
    [getNormalizedCoordinates, interactionDisabled, onBackgroundClick]
  );

  return (
    <div className={classNames('campaign-map-board', className, interactionDisabled && 'campaign-map-board--disabled')}>
      {title && <h5 className="campaign-map-board__title">{title}</h5>}
      {imageSrc ? (
        <div className="campaign-map-board__stage">
          <div className="campaign-map-board__image-wrapper">
            <img src={imageSrc} alt={altText} className="campaign-map-board__image" />
            <div
              className="campaign-map-board__tokens-layer"
              ref={layerRef}
              onPointerDown={handleLayerPointerDown}
            >
              {tokenPositions.map((token) => {
                const { characterId, position, color, label } = token;
                const draggable = !interactionDisabled && token.isMovable !== false;
                return (
                  <div
                    key={characterId}
                    role={draggable ? 'button' : undefined}
                    tabIndex={draggable ? 0 : -1}
                    aria-label={label || characterId}
                    className={classNames(
                      'campaign-map-board__token',
                      draggable && 'campaign-map-board__token--draggable'
                    )}
                    style={{
                      left: `${(position?.x ?? 0) * 100}%`,
                      top: `${(position?.y ?? 0) * 100}%`,
                    }}
                    onPointerDown={(event) => handlePointerDown(event, token)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    data-token-id={characterId}
                  >
                    <div
                      className={classNames(
                        'campaign-map-board__figurine',
                        draggable && 'campaign-map-board__figurine--active'
                      )}
                      style={{ '--figurine-color': color || undefined }}
                    >
                      <span className="campaign-map-board__figurine-figure" aria-hidden="true">
                        <span className="campaign-map-board__figurine-head" />
                        <span className="campaign-map-board__figurine-torso">
                          <span className="campaign-map-board__figurine-emblem">
                            {label ? label.charAt(0).toUpperCase() : ''}
                          </span>
                        </span>
                        <span className="campaign-map-board__figurine-cloak" />
                      </span>
                      <span className="campaign-map-board__figurine-base">
                        <span className="campaign-map-board__figurine-base-top" />
                        <span className="campaign-map-board__figurine-base-texture" />
                      </span>
                    </div>
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
      isMovable: PropTypes.bool,
    })
  ),
  onTokenDragStart: PropTypes.func,
  onTokenDrag: PropTypes.func,
  onTokenDragEnd: PropTypes.func,
  onTokenPositionChange: PropTypes.func,
  onBackgroundClick: PropTypes.func,
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
  disabled: false,
  className: '',
  children: null,
};

export default CampaignMapBoard;
