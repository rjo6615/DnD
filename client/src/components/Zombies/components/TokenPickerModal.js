import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Spinner, Row, Col, Alert, Form } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';

const DEFAULT_DM_FILTERS = [
  { key: 'all', label: 'All Tokens', folders: null, aliases: ['all'] },
  {
    key: 'adventurers',
    label: 'Adventurers',
    folders: ['Adventurers'],
    aliases: ['Adventurers', 'adventurers'],
  },
  { key: 'dm', label: 'Dungeon Master', folders: ['DM'], aliases: ['DM', 'dm'] },
];

const buildFilterMap = (filters = []) => {
  if (!Array.isArray(filters)) {
    return new Map();
  }

  return new Map(
    filters
      .filter((filter) => filter && typeof filter === 'object' && filter.key)
      .map((filter) => [filter.key, filter])
  );
};

const NBSP = '\u00A0';

const cloneFilters = (filters = []) => {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters
    .filter((filter) => filter && typeof filter === 'object')
    .map((filter) => ({
      ...filter,
      ...(Array.isArray(filter.folders) ? { folders: [...filter.folders] } : {}),
      ...(Array.isArray(filter.aliases) ? { aliases: [...filter.aliases] } : {}),
    }));
};

const buildDynamicDmFilters = (folderTree, fallbackFilters = DEFAULT_DM_FILTERS) => {
  const fallback = cloneFilters(fallbackFilters);

  if (!folderTree || typeof folderTree !== 'object') {
    return fallback;
  }

  const flatFolders = Array.isArray(folderTree.flatFolders) ? folderTree.flatFolders : [];
  const filters = [];

  const addFilter = (filter) => {
    if (!filter || typeof filter !== 'object' || !filter.key) {
      return;
    }

    if (filters.some((existing) => existing.key === filter.key)) {
      return;
    }

    const normalized = {
      ...filter,
      ...(Array.isArray(filter.folders) ? { folders: [...filter.folders] } : {}),
      ...(Array.isArray(filter.aliases)
        ? { aliases: Array.from(new Set(filter.aliases.filter(Boolean))) }
        : {}),
    };

    filters.push(normalized);
  };

  addFilter({ key: 'all', label: 'All Tokens', folders: null, aliases: ['all'] });

  flatFolders.forEach((entry) => {
    if (!entry || typeof entry.path !== 'string') {
      return;
    }

    const trimmedPath = entry.path.trim();
    if (!trimmedPath) {
      return;
    }

    const depth = Number.isInteger(entry.depth) ? entry.depth : 0;
    const indent = depth > 0 ? NBSP.repeat(depth * 2) : '';
    const displayPath =
      typeof entry.displayPath === 'string' && entry.displayPath.trim() !== ''
        ? entry.displayPath.trim()
        : typeof entry.relativePath === 'string' && entry.relativePath.trim() !== ''
          ? entry.relativePath.trim()
          : typeof entry.name === 'string' && entry.name.trim() !== ''
            ? entry.name.trim()
            : trimmedPath.split('/').pop();

    const aliases = [];
    const relativePath =
      typeof entry.relativePath === 'string' && entry.relativePath.trim() !== ''
        ? entry.relativePath.trim()
        : '';
    if (relativePath) {
      aliases.push(relativePath);
      aliases.push(relativePath.toLowerCase());
    }

    const name = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : '';
    if (name) {
      aliases.push(name);
      aliases.push(name.toLowerCase());
    }

    addFilter({
      key: `folder:${trimmedPath}`,
      label: `${indent}${displayPath}`,
      folders: [trimmedPath],
      aliases,
      depth,
    });
  });

  const hasAliasMatch = (filter, aliasSet) => {
    if (!filter) {
      return false;
    }

    if (aliasSet.has(filter.key)) {
      return true;
    }

    if (!Array.isArray(filter.aliases)) {
      return false;
    }

    return filter.aliases.some((alias) => aliasSet.has(alias));
  };

  fallback.forEach((fallbackFilter) => {
    const aliasSet = new Set(
      [fallbackFilter.key]
        .concat(Array.isArray(fallbackFilter.aliases) ? fallbackFilter.aliases : [])
        .filter(Boolean)
    );

    const alreadyPresent = filters.some((filter) => hasAliasMatch(filter, aliasSet));
    if (!alreadyPresent) {
      addFilter(fallbackFilter);
    }
  });

  return filters;
};

const TokenPickerModal = ({
  show,
  onHide,
  campaignId,
  onSelect,
  isDm = false,
  defaultFilter = 'adventurers',
  dmFilters = DEFAULT_DM_FILTERS,
  title = 'Choose Figurine Token',
  allowClear = false,
  onClear,
  isBusy = false,
  errorMessage = null,
}) => {
  const [dmFolderOptions, setDmFolderOptions] = useState(null);
  const [fetchingFolders, setFetchingFolders] = useState(false);

  const availableFilters = useMemo(() => {
    if (!isDm) {
      return [
        {
          key: 'adventurers',
          label: 'Adventurers',
          folders: null,
        },
      ];
    }

    if (Array.isArray(dmFolderOptions)) {
      return cloneFilters(dmFolderOptions);
    }

    return [];
  }, [isDm, dmFolderOptions]);

  const filterLookup = useMemo(() => buildFilterMap(availableFilters), [availableFilters]);

  const [selectedFilterKey, setSelectedFilterKey] = useState(null);

  useEffect(() => {
    if (filterLookup.size === 0) {
      if (selectedFilterKey !== null) {
        setSelectedFilterKey(null);
      }
      return;
    }

    if (selectedFilterKey && filterLookup.has(selectedFilterKey)) {
      return;
    }

    let nextKey = null;

    if (defaultFilter) {
      if (filterLookup.has(defaultFilter)) {
        nextKey = defaultFilter;
      } else {
        const aliasMatch = availableFilters.find(
          (filter) =>
            filter &&
            typeof filter === 'object' &&
            Array.isArray(filter.aliases) &&
            filter.aliases.includes(defaultFilter)
        );

        if (aliasMatch) {
          nextKey = aliasMatch.key;
        }
      }
    }

    if (!nextKey) {
      const [firstKey] = filterLookup.keys();
      nextKey = firstKey || null;
    }

    if (nextKey !== selectedFilterKey) {
      setSelectedFilterKey(nextKey);
    }
  }, [filterLookup, availableFilters, defaultFilter, selectedFilterKey]);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [manifestMeta, setManifestMeta] = useState(null);

  const resetState = useCallback(() => {
    setAssets([]);
    setLoading(false);
    setLoadingMore(false);
    setError(null);
    setNextCursor(null);
    setManifestMeta(null);
    setFetchingFolders(false);
  }, []);

  const activeFilter = selectedFilterKey && filterLookup.has(selectedFilterKey)
    ? filterLookup.get(selectedFilterKey)
    : filterLookup.size > 0
      ? filterLookup.values().next().value
      : null;

  const fetchManifest = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      if (!campaignId || !activeFilter) {
        return;
      }

      const encodedCampaignId = encodeURIComponent(campaignId);
      const params = new URLSearchParams();

      if (cursor) {
        params.set('nextCursor', cursor);
      }

      if (isDm) {
        const folders = activeFilter.folders;
        if (Array.isArray(folders) && folders.length > 0) {
          const sanitized = folders
            .map((folder) => (typeof folder === 'string' ? folder.trim() : ''))
            .filter(Boolean);
          if (sanitized.length > 0) {
            params.set('folders', sanitized.join(','));
          }
        }
      }

      const queryString = params.toString();
      const endpoint = `/campaigns/${encodedCampaignId}/token-manifest${
        queryString ? `?${queryString}` : ''
      }`;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setError(null);
        }

        const response = await apiFetch(endpoint);
        if (!response.ok) {
          throw new Error(response.statusText || 'Failed to load token manifest.');
        }

        const data = await response.json();
        const nextAssets = Array.isArray(data?.assets) ? data.assets.filter(Boolean) : [];
        setAssets((prev) => (append ? [...prev, ...nextAssets] : nextAssets));
        setNextCursor(typeof data?.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null);
        setManifestMeta(data || null);
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to load token manifest.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [campaignId, activeFilter, isDm]
  );

  useEffect(() => {
    if (!show) {
      resetState();
      if (isDm) {
        setDmFolderOptions(null);
      }
      return;
    }

    resetState();
    fetchManifest({ append: false, cursor: null });
  }, [show, fetchManifest, activeFilter, resetState, isDm]);

  useEffect(() => {
    if (!isDm) {
      return;
    }

    if (!show) {
      return;
    }

    const fallbackFilters =
      Array.isArray(dmFilters) && dmFilters.length > 0
        ? cloneFilters(dmFilters)
        : cloneFilters(DEFAULT_DM_FILTERS);

    if (!campaignId) {
      setDmFolderOptions(fallbackFilters);
      return;
    }

    let isCancelled = false;

    const fetchFolders = async () => {
      setFetchingFolders(true);
      try {
        const encodedCampaignId = encodeURIComponent(campaignId);
        const response = await apiFetch(`/campaigns/${encodedCampaignId}/token-folders`);

        if (!response?.ok) {
          throw new Error(response?.statusText || 'Failed to load token folders.');
        }

        const data = await response.json();
        if (isCancelled) {
          return;
        }

        setDmFolderOptions(buildDynamicDmFilters(data, fallbackFilters));
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          setDmFolderOptions(fallbackFilters);
        }
      } finally {
        if (!isCancelled) {
          setFetchingFolders(false);
        }
      }
    };

    fetchFolders();

    return () => {
      isCancelled = true;
    };
  }, [show, isDm, campaignId, dmFilters]);

  const handleFilterChange = useCallback(
    (event) => {
      const { value } = event.target;
      setSelectedFilterKey(value);
    },
    []
  );

  const handleSelectAsset = useCallback(
    (asset) => {
      if (typeof onSelect === 'function') {
        onSelect(asset);
      }
    },
    [onSelect]
  );

  const handleClearSelection = useCallback(() => {
    if (typeof onClear === 'function') {
      onClear();
    } else if (typeof onSelect === 'function') {
      onSelect(null);
    }
  }, [onClear, onSelect]);

  const renderBody = () => {
    if ((loading || fetchingFolders) && assets.length === 0) {
      return (
        <div className="text-center py-4" role="status" aria-live="polite">
          <Spinner animation="border" role="status" aria-hidden="true" />
          <div className="mt-2">Loading tokens…</div>
        </div>
      );
    }

    if (error && assets.length === 0) {
      return (
        <Alert variant="danger" className="mb-0">
          {error}
        </Alert>
      );
    }

    if (assets.length === 0) {
      return <div className="text-center text-muted py-4">No tokens found.</div>;
    }

    return (
      <>
        <Row xs={2} sm={3} md={4} className="g-3">
          {assets.map((asset) => {
            if (!asset || !asset.publicId) {
              return null;
            }

            const label = asset.filename || asset.publicId.split('/').pop();
            const folderLabel = asset.relativeFolder || manifestMeta?.appliedFolders?.[0] || '';

            return (
              <Col key={asset.publicId}>
                <Button
                  variant="outline-light"
                  className="w-100 h-100 text-start token-picker-option"
                  onClick={() => handleSelectAsset(asset)}
                  disabled={isBusy}
                >
                  <div className="ratio ratio-1x1 bg-dark-subtle rounded border border-secondary overflow-hidden">
                    {asset.secureUrl ? (
                      <img
                        src={asset.secureUrl}
                        alt={label || 'Token preview'}
                        className="w-100 h-100"
                        loading="lazy"
                        style={{ objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-2 fw-semibold text-truncate" title={label}>
                    {label || asset.publicId}
                  </div>
                  {folderLabel ? (
                    <div className="text-muted small text-truncate" title={folderLabel}>
                      {folderLabel}
                    </div>
                  ) : null}
                </Button>
              </Col>
            );
          })}
        </Row>
        {error ? (
          <Alert variant="warning" className="mt-3">
            {error}
          </Alert>
        ) : null}
        {errorMessage ? (
          <Alert variant="danger" className="mt-3">
            {errorMessage}
          </Alert>
        ) : null}
        {nextCursor ? (
          <div className="text-center mt-3">
            <Button
              variant="outline-light"
              onClick={() => fetchManifest({ append: true, cursor: nextCursor })}
              disabled={loadingMore || isBusy}
            >
              {loadingMore ? (
                <>
                  <Spinner
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      scrollable
      className="dnd-modal"
      backdrop={isBusy ? 'static' : true}
      keyboard={!isBusy}
    >
      <Modal.Header closeButton={!isBusy}>
        <Modal.Title>
          {title}
          {isBusy ? (
            <Spinner
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              className="ms-2"
            />
          ) : null}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isDm && availableFilters.length > 1 ? (
          <Form.Group className="mb-3" controlId="tokenPickerFilter">
            <Form.Label>Token Library</Form.Label>
            <Form.Select
              value={selectedFilterKey ?? ''}
              onChange={handleFilterChange}
              aria-label="Select token library"
              disabled={isBusy}
            >
              {availableFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        ) : null}
        {renderBody()}
      </Modal.Body>
      <Modal.Footer>
        {allowClear ? (
          <Button variant="outline-secondary" onClick={handleClearSelection} disabled={isBusy}>
            Clear selection
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onHide} disabled={isBusy}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

TokenPickerModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func,
  campaignId: PropTypes.string,
  onSelect: PropTypes.func,
  isDm: PropTypes.bool,
  defaultFilter: PropTypes.string,
  dmFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      folders: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.oneOf([null]),
      ]),
    })
  ),
  title: PropTypes.string,
  allowClear: PropTypes.bool,
  onClear: PropTypes.func,
  isBusy: PropTypes.bool,
  errorMessage: PropTypes.string,
};

export default TokenPickerModal;
