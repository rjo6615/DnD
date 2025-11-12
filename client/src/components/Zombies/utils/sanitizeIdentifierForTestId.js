export const sanitizeIdentifierForTestId = (value, fallback = '') => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
  }
  if (typeof fallback === 'string' && fallback.trim() !== '') {
    return fallback
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
  }
  return '';
};

export default sanitizeIdentifierForTestId;
