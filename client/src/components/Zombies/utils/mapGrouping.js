export const UNGROUPED_FOLDER_KEY = '__ungrouped__';

export const normalizeFolderName = (value) =>
  typeof value === 'string' ? value.trim() : '';

export const groupMapsByFolder = (maps) => {
  if (!Array.isArray(maps) || maps.length === 0) {
    return [];
  }

  const groups = new Map();

  maps.forEach((mapItem) => {
    if (!mapItem || typeof mapItem !== 'object') {
      return;
    }

    const folderName = normalizeFolderName(mapItem.folder);
    const key = folderName || UNGROUPED_FOLDER_KEY;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: folderName || 'No Folder',
        maps: [],
      });
    }

    groups.get(key).maps.push(mapItem);
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === UNGROUPED_FOLDER_KEY && b.key === UNGROUPED_FOLDER_KEY) {
      return 0;
    }
    if (a.key === UNGROUPED_FOLDER_KEY) {
      return -1;
    }
    if (b.key === UNGROUPED_FOLDER_KEY) {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });
};
