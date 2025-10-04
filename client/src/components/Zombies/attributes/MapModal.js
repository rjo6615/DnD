import React, { useMemo, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import MapDisplay from './MapDisplay';
import CampaignMapBoard from './CampaignMapBoard';
import { groupMapsByFolder, UNGROUPED_FOLDER_KEY } from '../utils/mapGrouping';
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
}) => {
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

  const previewMapId = useMemo(
    () => normalizeMapId(previewMap?.mapId),
    [previewMap]
  );

  const groupedMaps = useMemo(
    () => groupMapsByFolder(normalizedMaps),
    [normalizedMaps]
  );

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
    if (!previewMapId) {
      return {};
    }

    if (tokensByMapId && typeof tokensByMapId === 'object') {
      const entry = tokensByMapId[previewMapId];
      if (entry && typeof entry === 'object') {
        return sanitizeTokenDictionary(entry);
      }
    }

    if (previewMap && typeof previewMap === 'object' && previewMap.tokens) {
      return sanitizeTokenDictionary(previewMap.tokens);
    }

    return {};
  }, [previewMap, previewMapId, tokensByMapId]);

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
  }, [previewMapId, currentCharacterId]);

  const isInteractive = useMemo(
    () => typeof onTokenMove === 'function' && Boolean(previewMapId),
    [onTokenMove, previewMapId]
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

        const isMovable =
          isInteractive &&
          !placementPending &&
          (!readOnly || token.characterId === normalizedCurrentCharacterId);

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
    return tokensDictionary[normalizedCurrentCharacterId] || null;
  }, [normalizedCurrentCharacterId, tokensDictionary]);

  const handleCommitMove = useCallback(
    async ({ characterId, x, y }) => {
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
        const result = await onTokenMove({
          mapId: previewMapId,
          characterId: normalizedCharacterId,
          x,
          y,
        });

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
    ({ characterId, x, y }) => {
      if (!isInteractive) {
        return;
      }

      handleCommitMove({ characterId, x, y });
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

    if (!isInteractive) {
      return <MapDisplay map={previewMap} />;
    }

    return (
      <>
        <div className="map-modal__board-wrapper">
          <CampaignMapBoard
            map={previewMap}
            tokens={boardTokens}
            disabled={placementPending}
            onTokenPositionChange={handleTokenPositionChange}
            onBackgroundClick={handleBackgroundPlacement}
            onTokenRemove={handleTokenRemove}
          />
          {placementPending && (
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
        {canClickToPlace && (
          <div className="text-info small mt-3" data-testid="map-modal-placement-hint">
            Click the map to place your figurine.
          </div>
        )}
        {placementError && (
          <Alert variant="danger" className="mt-3" data-testid="map-modal-placement-error">
            {placementError}
          </Alert>
        )}
      </>
    );
  };

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
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
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {hasManagementFeatures ? (
          <div className="d-flex flex-column flex-lg-row gap-4">
            <div className="flex-grow-1" data-testid="map-modal-sidebar">
              <h5 className="h6 mb-3">Saved Maps</h5>
              {renderMapList()}
            </div>
            <div className="flex-grow-1" data-testid="map-modal-preview">
              {previewMap ? renderPreviewContent() : (
                <p className="text-muted mb-0">No map selected.</p>
              )}
            </div>
          </div>
        ) : (
          <div data-testid="map-modal-preview">
            {previewMap ? renderPreviewContent() : (
              <p className="text-muted mb-0">No map image available.</p>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button className="action-btn close-btn" onClick={handleModalHide} data-testid="map-modal-close">
          Close
        </Button>
      </Modal.Footer>
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
};

export default MapModal;
