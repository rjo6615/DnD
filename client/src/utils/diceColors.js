const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_DICE_COLOR = '#000000';
export const DICE_FACE_OPACITY = 0.85;

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
  normalizeDiceColor,
  hexToRgba,
  applyDiceFaceColor,
};
