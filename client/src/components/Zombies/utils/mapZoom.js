export const MAP_ZOOM_DEFAULT = 1;
export const MAP_ZOOM_MIN = 0.5;
export const MAP_ZOOM_MAX = 6;

export const clampMapZoom = (value) => {
  if (!Number.isFinite(value)) {
    return MAP_ZOOM_DEFAULT;
  }

  if (value < MAP_ZOOM_MIN) {
    return MAP_ZOOM_MIN;
  }

  if (value > MAP_ZOOM_MAX) {
    return MAP_ZOOM_MAX;
  }

  return value;
};

export default clampMapZoom;
