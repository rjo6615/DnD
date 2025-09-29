const DEFAULT_MAP_TITLE = 'Generated Battle Map';
const MAX_TITLE_LENGTH = 60;

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const toTitleCase = (value) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length === 0) {
        return '';
      }
      const [firstChar, ...rest] = word;
      return `${firstChar.toUpperCase()}${rest.join('').toLowerCase()}`;
    })
    .join(' ');

const truncate = (value, maxLength) => {
  if (!value || value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength);
  const withoutPartialWord = truncated.replace(/\s+\S*$/, '').trim();

  if (withoutPartialWord.length >= Math.floor(maxLength * 0.6)) {
    return withoutPartialWord;
  }

  return truncated.trim();
};

const deriveClause = (value) => {
  const clauseMatch = value.match(/^[^.!?;:\n]+/);
  if (clauseMatch && clauseMatch[0]) {
    return clauseMatch[0].trim();
  }
  const firstLine = value.split(/\n/)[0];
  if (firstLine && firstLine.trim()) {
    return firstLine.trim();
  }
  return value;
};

const deriveMapTitle = ({ revisedPrompt, prompt, fallback = DEFAULT_MAP_TITLE } = {}) => {
  const sources = [revisedPrompt, prompt];
  const sourceText = sources.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  if (!sourceText) {
    return fallback;
  }

  const normalized = normalizeWhitespace(sourceText);
  if (!normalized) {
    return fallback;
  }

  let clause = deriveClause(normalized);
  if (!clause) {
    clause = normalized;
  }

  clause = clause.replace(/[\s\-–—]+$/, '').trim();
  if (!clause) {
    clause = normalized;
  }

  clause = truncate(clause, MAX_TITLE_LENGTH);
  if (!clause) {
    return fallback;
  }

  const title = toTitleCase(clause);
  return title || fallback;
};

module.exports = {
  DEFAULT_MAP_TITLE,
  deriveMapTitle,
};
