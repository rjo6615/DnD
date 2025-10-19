const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_DICE_COLOR = '#000000';
export const DICE_FACE_OPACITY = 0.85;
export const DICE_EDGE_OPACITY = 0.68;

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

const componentToHex = (value) => clampByte(value).toString(16).padStart(2, '0');

const hexToRgb = (hex) => {
  const normalized = normalizeDiceColor(hex) || DEFAULT_DICE_COLOR;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = ({ r, g, b }) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

const mixHexColors = (base, mixWith, ratio) => {
  const normalizedRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  if (normalizedRatio === 0) {
    return normalizeDiceColor(base) || DEFAULT_DICE_COLOR;
  }
  if (normalizedRatio === 1) {
    return normalizeDiceColor(mixWith) || DEFAULT_DICE_COLOR;
  }

  const baseRgb = hexToRgb(base);
  const mixRgb = hexToRgb(mixWith);
  return rgbToHex({
    r: baseRgb.r + (mixRgb.r - baseRgb.r) * normalizedRatio,
    g: baseRgb.g + (mixRgb.g - baseRgb.g) * normalizedRatio,
    b: baseRgb.b + (mixRgb.b - baseRgb.b) * normalizedRatio,
  });
};

const lightenHex = (color, ratio = 0) => mixHexColors(color, '#ffffff', ratio);

export const normalizeDiceColor = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
};

export const hexToRgba = (hex, opacity = DICE_FACE_OPACITY) => {
  const normalized = normalizeDiceColor(hex) || DEFAULT_DICE_COLOR;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const CATEGORY_COLOR_RULES = {
  base: {
    surfaceMix: 0,
    edgeMix: 0.4,
    mixWith: '#ffffff',
  },
  bonus: {
    surfaceMix: 0.18,
    edgeMix: 0.55,
    mixWith: '#ffffff',
  },
  critical: {
    surfaceMix: 0.28,
    edgeMix: 0.6,
    mixWith: '#ffd670',
  },
  'critical-bonus': {
    surfaceMix: 0.24,
    edgeMix: 0.58,
    mixWith: '#ffb347',
  },
};

export const createDiceCategoryStyles = (color, category = 'base') => {
  const normalized = normalizeDiceColor(color) || DEFAULT_DICE_COLOR;
  const rule = CATEGORY_COLOR_RULES[category] || CATEGORY_COLOR_RULES.base;
  const surfaceHex = rule.surfaceMix
    ? mixHexColors(normalized, rule.mixWith, rule.surfaceMix)
    : normalized;
  const edgeHex = rule.edgeMix
    ? mixHexColors(surfaceHex, '#ffffff', rule.edgeMix)
    : lightenHex(surfaceHex, 0.35);

  return {
    '--die-surface-color': hexToRgba(surfaceHex, DICE_FACE_OPACITY),
    '--die-edge-color': hexToRgba(edgeHex, DICE_EDGE_OPACITY),
  };
};

export const applyDiceFaceColor = (color, opacity = DICE_FACE_OPACITY) => {
  if (typeof document === 'undefined') {
    return;
  }
  const rgbaColor = hexToRgba(color, opacity);
  document.documentElement.style.setProperty('--dice-face-color', rgbaColor);
};

export default {
  DEFAULT_DICE_COLOR,
  DICE_FACE_OPACITY,
  DICE_EDGE_OPACITY,
  normalizeDiceColor,
  hexToRgba,
  createDiceCategoryStyles,
  applyDiceFaceColor,
};
