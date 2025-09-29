import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
import MapDisplay from './MapDisplay';

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

    return (
      <ListGroup
        variant="flush"
        className="bg-transparent map-modal__list"
        data-testid="map-modal-list"
      >
        {normalizedMaps.map((mapItem, index) => {
          const mapId = normalizeMapId(mapItem?.mapId);
          const key = mapId || `map-${index}`;
          const isActive = Boolean(normalizedActiveId && mapId && normalizedActiveId === mapId);
          const isSelected = Boolean(resolvedSelectedId && mapId && resolvedSelectedId === mapId);
          const isProcessing = Boolean(mapId && normalizedActionId && normalizedActionId === mapId);
          const titleText = resolveMapTitle(mapItem, index);
          const canSelect = typeof onSelectMap === 'function' && Boolean(mapId);
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
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="fw-semibold">{titleText}</div>
                {isActive && (
                  <Badge bg="success" className="ms-2" data-testid={`map-modal-active-badge-${key}`}>
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
      </ListGroup>
    );
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size={hasManagementFeatures ? 'xl' : 'lg'}
      centered
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
              {previewMap ? (
                <MapDisplay map={previewMap} />
              ) : (
                <p className="text-muted mb-0">No map selected.</p>
              )}
            </div>
          </div>
        ) : (
          <div data-testid="map-modal-preview">
            {previewMap ? (
              <MapDisplay map={previewMap} />
            ) : (
              <p className="text-muted mb-0">No map image available.</p>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} data-testid="map-modal-close">
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
};

export default MapModal;
