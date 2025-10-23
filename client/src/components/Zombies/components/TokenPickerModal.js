import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const DEFAULT_PLAYER_FILTERS = [
  {
    key: 'adventurers',
    label: 'Adventurers',
    folders: ['Adventurers'],
    aliases: ['Adventurers', 'adventurers'],
  },
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

const buildScopeVariantSet = (values) => {
  const rawValues = Array.isArray(values) ? values : [values];
  return rawValues.reduce((set, value) => {
    if (typeof value !== 'string') {
      return set;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return set;
    }

    const lower = trimmed.toLowerCase();
    const compact = lower.replace(/[^a-z0-9]/g, '');

    set.add(lower);
    if (compact && compact !== lower) {
      set.add(compact);
    }

    return set;
  }, new Set());
};

const FOLDER_SCOPE_PREFIX = 'folder:';

const normalizeFolderHint = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.replace(/\u00A0/g, ' ').trim();
  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed.toLowerCase().startsWith(FOLDER_SCOPE_PREFIX)
    ? trimmed.slice(FOLDER_SCOPE_PREFIX.length)
    : trimmed;

  const segments = withoutPrefix
    .split(/[\\/]+/g)
    .map((segment) => segment.replace(/\u00A0/g, ' ').trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  if (segments[0].toLowerCase() !== 'tokens') {
    segments.unshift('Tokens');
  } else {
    segments[0] = 'Tokens';
  }

  if (segments.length > 1 && segments[1].toLowerCase() === 'dm') {
    segments[1] = 'DM';
  }

  const hasAdversaries = segments.some((segment) => segment.toLowerCase() === 'adversaries');
  const hasAdventurers = segments.some((segment) => segment.toLowerCase() === 'adventurers');

  if (!hasAdversaries && !hasAdventurers) {
    const insertIndex = segments.length > 1 && segments[1] === 'DM' ? 2 : 1;
    segments.splice(insertIndex, 0, 'Adventurers');
  }

  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].toLowerCase() === 'adversaries') {
      segments[i] = 'Adversaries';
    } else if (segments[i].toLowerCase() === 'adventurers') {
      segments[i] = 'Adventurers';
    }
  }

  return segments.join('/');
};

const buildFolderHintsFromScope = (scopeValues) => {
  if (!scopeValues) {
    return [];
  }

  const rawValues =
    scopeValues instanceof Set
      ? Array.from(scopeValues)
      : Array.isArray(scopeValues)
        ? scopeValues
        : [scopeValues];

  const seen = new Set();
  const hints = [];

  rawValues.forEach((value) => {
    const normalized = normalizeFolderHint(value);
    if (!normalized) {
      return;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    hints.push(normalized);
  });

  const getSegments = (value) =>
    typeof value === 'string'
      ? value
          .split('/')
          .map((segment) => segment.trim())
          .filter(Boolean)
      : [];

  const sortedHints = hints.sort((a, b) => {
    const aSegments = getSegments(a);
    const bSegments = getSegments(b);

    const aIsDm = aSegments.length > 1 && aSegments[1].toLowerCase() === 'dm';
    const bIsDm = bSegments.length > 1 && bSegments[1].toLowerCase() === 'dm';

    if (aIsDm !== bIsDm) {
      return aIsDm ? -1 : 1;
    }

    if (aSegments.length !== bSegments.length) {
      return bSegments.length - aSegments.length;
    }

    if (a.length !== b.length) {
      return b.length - a.length;
    }

    return a.localeCompare(b);
  });

  const compareFolderSpecificity = (a, b) => {
    const aSegments = getSegments(a);
    const bSegments = getSegments(b);

    if (aSegments.length !== bSegments.length) {
      return aSegments.length - bSegments.length;
    }

    if (a.length !== b.length) {
      return a.length - b.length;
    }

    return a.localeCompare(b);
  };

  const dmHints = sortedHints.filter((value) => {
    if (typeof value !== 'string') {
      return false;
    }

    const segments = value
      .split('/')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean);

    return segments.length > 1 && segments[1] === 'dm';
  });

  if (dmHints.length > 0) {
    const sortedDmHints = [...dmHints].sort(compareFolderSpecificity);
    return [sortedDmHints[0]];
  }

  return sortedHints;
};

const normalizeVariantData = (value, cache) => {
  if (!cache.has(value)) {
    if (typeof value !== 'string') {
      cache.set(value, null);
    } else {
      const trimmed = value.replace(/\u00A0/g, ' ').trim();
      if (!trimmed) {
        cache.set(value, null);
      } else {
        const lower = trimmed.toLowerCase();
        cache.set(value, {
          lower,
          compact: lower.replace(/[^a-z0-9]/g, ''),
          segments: trimmed
            .split('/')
            .map((segment) => segment.replace(/\u00A0/g, ' ').trim())
            .filter(Boolean)
            .map((segment) => segment.toLowerCase().replace(/[^a-z0-9]+/g, '')),
        });
      }
    }
  }

  return cache.get(value);
};

const segmentsContainSubsequence = (segments, target) => {
  if (!Array.isArray(segments) || !Array.isArray(target) || target.length === 0) {
    return false;
  }

  let searchIndex = 0;
  return target.every((needle) => {
    const foundIndex = segments.indexOf(needle, searchIndex);
    if (foundIndex === -1) {
      return false;
    }

    searchIndex = foundIndex + 1;
    return true;
  });
};

const filterMatchesScope = (filter, scopeSet) => {
  if (!(scopeSet instanceof Set) || scopeSet.size === 0) {
    return true;
  }

  if (!filter || typeof filter !== 'object') {
    return false;
  }

  const filterValues = [];
  if (typeof filter.key === 'string') {
    filterValues.push(filter.key);
  }
  if (typeof filter.label === 'string') {
    filterValues.push(filter.label);
  }
  if (Array.isArray(filter.aliases)) {
    filterValues.push(...filter.aliases);
  }
  if (Array.isArray(filter.folders)) {
    filterValues.push(...filter.folders);
  }

  const filterVariantSet = buildScopeVariantSet(filterValues);
  if (filterVariantSet.size === 0) {
    return false;
  }

  const scopeCache = new Map();
  const filterCache = new Map();

  for (const scopeVariant of scopeSet) {
    const scopeData = normalizeVariantData(scopeVariant, scopeCache);
    if (!scopeData) {
      continue;
    }

    for (const filterVariant of filterVariantSet) {
      const filterData = normalizeVariantData(filterVariant, filterCache);
      if (!filterData) {
        continue;
      }

      if (filterData.lower === scopeData.lower || filterData.compact === scopeData.compact) {
        return true;
      }

      if (segmentsContainSubsequence(filterData.segments, scopeData.segments)) {
        return true;
      }
    }
  }

  return false;
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

const buildPlayerFolderFilters = (folderTree, fallbackFilters = DEFAULT_PLAYER_FILTERS) => {
  const fallback = cloneFilters(fallbackFilters);
  const filters = [];
  const seenKeys = new Set();

  const addFilter = (filter) => {
    if (!filter || typeof filter !== 'object' || !filter.key) {
      return;
    }

    if (seenKeys.has(filter.key)) {
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
    seenKeys.add(normalized.key);
  };

  const fallbackRoot =
    fallback.find((filter) => filter && filter.key === 'adventurers') ||
    {
      key: 'adventurers',
      label: 'Adventurers',
      folders: ['Adventurers'],
      aliases: ['Adventurers', 'adventurers'],
    };

  const fallbackRootFolders = Array.isArray(fallbackRoot.folders)
    ? fallbackRoot.folders
        .map((folder) => (typeof folder === 'string' ? folder.trim() : ''))
        .filter(Boolean)
    : [];

  const inferredRootPath =
    typeof folderTree?.folders?.[0]?.path === 'string' &&
    folderTree.folders[0].path.trim() !== ''
      ? folderTree.folders[0].path.trim()
      : null;

  const resolvedRootFolders =
    inferredRootPath && inferredRootPath.trim() !== ''
      ? [inferredRootPath.trim()]
      : fallbackRootFolders.length > 0
        ? fallbackRootFolders
        : ['Adventurers'];

  addFilter({
    ...fallbackRoot,
    folders: resolvedRootFolders,
    aliases: Array.isArray(fallbackRoot.aliases)
      ? Array.from(
          new Set(
            fallbackRoot.aliases
              .concat(['Adventurers', 'adventurers'])
              .filter(Boolean)
          )
        )
      : ['Adventurers', 'adventurers'],
    depth: 0,
  });

  const playerRootPath = resolvedRootFolders[0] || null;
  const rootLeaf = playerRootPath
    ? playerRootPath
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .pop()
    : null;

  const flatFolders = Array.isArray(folderTree?.flatFolders)
    ? folderTree.flatFolders
    : [];

  flatFolders.forEach((entry) => {
    if (!entry || typeof entry.path !== 'string') {
      return;
    }

    const normalizedPath = entry.path.trim();
    if (!normalizedPath) {
      return;
    }

    if (playerRootPath && normalizedPath === playerRootPath) {
      return;
    }

    const depth = Number.isInteger(entry.depth) ? entry.depth : 0;
    const indent = depth > 0 ? NBSP.repeat(depth * 2) : '';

    const relativePath =
      typeof entry.relativePath === 'string' && entry.relativePath.trim() !== ''
        ? entry.relativePath.trim()
        : '';

    const relativeSegments = relativePath
      ? relativePath.split('/').map((segment) => segment.trim()).filter(Boolean)
      : [];

    const trimmedSegments =
      rootLeaf && relativeSegments.length > 0 && relativeSegments[0] === rootLeaf
        ? relativeSegments.slice(1)
        : relativeSegments;

    const trimmedRelativePath = trimmedSegments.join('/');

    const displayCandidate =
      trimmedRelativePath ||
      (typeof entry.displayPath === 'string' && entry.displayPath.trim() !== ''
        ? entry.displayPath.trim()
        : typeof entry.name === 'string' && entry.name.trim() !== ''
          ? entry.name.trim()
          : normalizedPath.split('/').pop());

    const aliasSet = new Set();

    if (trimmedRelativePath) {
      aliasSet.add(trimmedRelativePath);
      aliasSet.add(trimmedRelativePath.toLowerCase());
    }

    if (relativePath) {
      aliasSet.add(relativePath);
      aliasSet.add(relativePath.toLowerCase());
    }

    if (displayCandidate) {
      aliasSet.add(displayCandidate);
      aliasSet.add(displayCandidate.toLowerCase());
    }

    addFilter({
      key: `folder:${normalizedPath}`,
      label: `${indent}${displayCandidate}`,
      folders: [normalizedPath],
      aliases: Array.from(aliasSet).filter(Boolean),
      depth,
    });
  });

  return filters.length > 0 ? filters : fallback;
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
  filterScope = null,
}) => {
  const [dmFolderOptions, setDmFolderOptions] = useState(null);
  const [playerFolderOptions, setPlayerFolderOptions] = useState(() =>
    cloneFilters(DEFAULT_PLAYER_FILTERS)
  );
  const [fetchingFolders, setFetchingFolders] = useState(false);
  const hasLoadedDmFoldersRef = useRef(false);
  const hasLoadedPlayerFoldersRef = useRef(false);

  const baseFilters = useMemo(() => {
    if (isDm) {
      if (Array.isArray(dmFolderOptions)) {
        return cloneFilters(dmFolderOptions);
      }

      return [];
    }

    if (Array.isArray(playerFolderOptions) && playerFolderOptions.length > 0) {
      return cloneFilters(playerFolderOptions);
    }

    return cloneFilters(DEFAULT_PLAYER_FILTERS);
  }, [isDm, dmFolderOptions, playerFolderOptions]);

  const filterScopeSet = useMemo(() => buildScopeVariantSet(filterScope), [filterScope]);
  const scopeFolderHints = useMemo(() => buildFolderHintsFromScope(filterScope), [filterScope]);

  const availableFilters = useMemo(() => {
    if (!Array.isArray(baseFilters)) {
      return [];
    }

    if (!(filterScopeSet instanceof Set) || filterScopeSet.size === 0) {
      return baseFilters;
    }

    const scoped = baseFilters.filter((filter) => filterMatchesScope(filter, filterScopeSet));
    if (scoped.length > 0) {
      return scoped;
    }

    return baseFilters;
  }, [baseFilters, filterScopeSet]);

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

  const resetState = useCallback((options = {}) => {
    const {
      resetFolderLoading = true,
      preserveAssets = false,
      preserveManifest = false,
    } = options;

    if (!preserveAssets) {
      setAssets([]);
    }

    setLoading(false);
    setLoadingMore(false);
    setError(null);

    if (!preserveManifest) {
      setNextCursor(null);
      setManifestMeta(null);
    }

    if (resetFolderLoading) {
      setFetchingFolders(false);
    }
  }, []);

  const activeFilter = useMemo(() => {
    if (selectedFilterKey && filterLookup.has(selectedFilterKey)) {
      return filterLookup.get(selectedFilterKey);
    }

    if (filterLookup.size > 0) {
      return filterLookup.values().next().value;
    }

    return null;
  }, [filterLookup, selectedFilterKey]);

  const activeFilterMatchesScope = useMemo(() => {
    if (!(filterScopeSet instanceof Set) || filterScopeSet.size === 0) {
      return true;
    }

    if (!activeFilter) {
      return false;
    }

    return filterMatchesScope(activeFilter, filterScopeSet);
  }, [activeFilter, filterScopeSet]);

  const resolvedFolders = useMemo(() => {
    if (activeFilter && Array.isArray(activeFilter.folders)) {
      const sanitized = activeFilter.folders
        .map((folder) => (typeof folder === 'string' ? folder.trim() : ''))
        .filter(Boolean);

      if (sanitized.length > 0) {
        const normalized = sanitized
          .map((folder) => {
            if (typeof folder !== 'string') {
              return '';
            }

            const trimmed = folder.trim();
            if (!trimmed) {
              return '';
            }

            if (/^tokens\//i.test(trimmed)) {
              return trimmed.replace(/^tokens\//i, 'Tokens/');
            }

            if (trimmed.includes('/')) {
              return `Tokens/${trimmed.replace(/^\/+/, '').replace(/\\+/g, '/')}`;
            }

            return trimmed;
          })
          .filter(Boolean);

        const hasTokenPrefix = normalized.some((folder) => /^Tokens\//.test(folder));
        if (hasTokenPrefix) {
          return normalized;
        }

        if (scopeFolderHints.length > 0) {
          return scopeFolderHints;
        }

        return normalized;
      }
    }

    if (scopeFolderHints.length > 0) {
      return scopeFolderHints;
    }

    return null;
  }, [activeFilter, scopeFolderHints]);

  const manifestFilterKey = useMemo(() => {
    if (!activeFilter) {
      if (resolvedFolders && resolvedFolders.length > 0) {
        return `scope::${resolvedFolders.join(',')}`;
      }

      return 'none';
    }

    const folders = Array.isArray(activeFilter.folders)
      ? activeFilter.folders
          .map((folder) => (typeof folder === 'string' ? folder.trim() : ''))
          .filter(Boolean)
      : [];

    const folderKey = folders.length > 0 ? folders.join(',') : '';
    const resolvedKey =
      !folderKey && resolvedFolders && resolvedFolders.length > 0
        ? resolvedFolders.join(',')
        : folderKey;

    return `${activeFilter.key || 'unknown'}::${resolvedKey}`;
  }, [activeFilter, resolvedFolders]);

  const shouldDeferManifest = useMemo(() => {
    if (!(filterScopeSet instanceof Set) || filterScopeSet.size === 0) {
      return false;
    }

    if (activeFilterMatchesScope) {
      return false;
    }

    return !resolvedFolders || resolvedFolders.length === 0;
  }, [activeFilterMatchesScope, filterScopeSet, resolvedFolders]);

  const fetchManifest = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      if (!campaignId || (!activeFilter && (!resolvedFolders || resolvedFolders.length === 0))) {
        return;
      }

      const encodedCampaignId = encodeURIComponent(campaignId);
      const params = new URLSearchParams();

      if (cursor) {
        params.set('nextCursor', cursor);
      }

      const folders = resolvedFolders;
      if (folders && folders.length > 0) {
        params.set('folders', folders.join(','));
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
        let parsedBody = null;

        if (typeof response?.json === 'function') {
          try {
            parsedBody = await response.json();
          } catch (parseError) {
            parsedBody = null;
          }
        }

        if (!response.ok) {
          const messageSource = [
            parsedBody && typeof parsedBody.message === 'string' ? parsedBody.message.trim() : '',
            parsedBody && typeof parsedBody.details === 'string' ? parsedBody.details.trim() : '',
            parsedBody && typeof parsedBody.error === 'string' ? parsedBody.error.trim() : '',
            typeof response.statusText === 'string' ? response.statusText.trim() : '',
          ].find((value) => value);

          throw new Error(messageSource || 'Failed to load token manifest.');
        }

        if (parsedBody === null) {
          throw new Error('Failed to parse token manifest response.');
        }

        const data = parsedBody;
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
    [campaignId, activeFilter, isDm, resolvedFolders]
  );

  const fetchManifestRef = useRef(fetchManifest);
  const lastFetchKeyRef = useRef(null);

  useEffect(() => {
    fetchManifestRef.current = fetchManifest;
  }, [fetchManifest]);

  useEffect(() => {
    lastFetchKeyRef.current = null;

    if (isDm) {
      setDmFolderOptions(null);
      hasLoadedDmFoldersRef.current = false;
    } else {
      hasLoadedPlayerFoldersRef.current = false;
      setPlayerFolderOptions(cloneFilters(DEFAULT_PLAYER_FILTERS));
    }
    resetState();
  }, [campaignId, isDm, resetState]);

  useEffect(() => {
    if (!show) {
      resetState({ preserveAssets: true, preserveManifest: true, resetFolderLoading: false });
      return;
    }

    if (!campaignId || manifestFilterKey === 'none' || shouldDeferManifest) {
      return;
    }

    const fetchKey = `${campaignId}::${manifestFilterKey}`;

    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }

    lastFetchKeyRef.current = fetchKey;

    resetState({ resetFolderLoading: false });
    if (fetchManifestRef.current) {
      fetchManifestRef.current({ append: false, cursor: null });
    }
  }, [
    show,
    manifestFilterKey,
    campaignId,
    isDm,
    resetState,
    shouldDeferManifest,
  ]);

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

    if (scopeFolderHints.length > 0) {
      setDmFolderOptions(fallbackFilters);
      hasLoadedDmFoldersRef.current = true;
      return;
    }

    if (!campaignId) {
      setDmFolderOptions(fallbackFilters);
      hasLoadedDmFoldersRef.current = false;
      return;
    }

    if (hasLoadedDmFoldersRef.current && Array.isArray(dmFolderOptions) && dmFolderOptions.length > 0) {
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
        hasLoadedDmFoldersRef.current = true;
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          setDmFolderOptions(fallbackFilters);
          hasLoadedDmFoldersRef.current = false;
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
  }, [show, isDm, campaignId, dmFilters, scopeFolderHints]);

  useEffect(() => {
    if (isDm) {
      return;
    }

    if (!show) {
      return;
    }

    const fallbackFilters = cloneFilters(DEFAULT_PLAYER_FILTERS);

    if (!campaignId) {
      setPlayerFolderOptions(fallbackFilters);
      hasLoadedPlayerFoldersRef.current = false;
      return;
    }

    if (hasLoadedPlayerFoldersRef.current && Array.isArray(playerFolderOptions) && playerFolderOptions.length > 0) {
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

        setPlayerFolderOptions(buildPlayerFolderFilters(data, fallbackFilters));
        hasLoadedPlayerFoldersRef.current = true;
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          setPlayerFolderOptions(fallbackFilters);
          hasLoadedPlayerFoldersRef.current = false;
        }
      } finally {
        if (!isCancelled) {
          setFetchingFolders(false);
        }
      }
    };

    setPlayerFolderOptions(fallbackFilters);
    fetchFolders();

    return () => {
      isCancelled = true;
    };
  }, [show, isDm, campaignId]);

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
        {availableFilters.length > 0 ? (
          <Form.Group className="mb-3" controlId="tokenPickerFilter">
            <Form.Label>Token Library</Form.Label>
            <Form.Select
              value={selectedFilterKey ?? ''}
              onChange={handleFilterChange}
              aria-label="Select token library"
              disabled={isBusy || fetchingFolders}
            >
              {fetchingFolders ? (
                <option value="" disabled>
                  Loading token folders…
                </option>
              ) : null}
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
  filterScope: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
};

export default TokenPickerModal;
