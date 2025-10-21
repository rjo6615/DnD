import rawSpells from './spells.json';

const ACTION_TYPE_TO_CASTING_TIME = {
  action: '1 action',
  bonusAction: '1 bonus action',
  reaction: '1 reaction',
};

function toTitleCase(value = '') {
  if (typeof value !== 'string') return value;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSpell(spell) {
  if (!spell || typeof spell !== 'object') return null;
  if (typeof spell.name !== 'string' || !spell.name.trim()) return null;

  const normalized = { ...spell };
  const lookupName = normalized.name.toLowerCase();

  if (!normalized.castingTime) {
    const actionType = normalized.actionType;
    if (typeof actionType === 'string' && ACTION_TYPE_TO_CASTING_TIME[actionType]) {
      normalized.castingTime = ACTION_TYPE_TO_CASTING_TIME[actionType];
    }
  }

  if (!normalized.castingTime) {
    normalized.castingTime = '1 action';
  }

  if (Array.isArray(normalized.classes)) {
    normalized.classes = normalized.classes
      .map(cls => (typeof cls === 'string' ? cls.toLowerCase() : cls))
      .filter(Boolean);
  }

  if (normalized.school) {
    normalized.school = toTitleCase(normalized.school);
  }

  if (!normalized.higherLevels && typeof normalized.higherLevelSlot === 'string') {
    normalized.higherLevels = normalized.higherLevelSlot;
  }

  delete normalized.actionType;
  delete normalized.higherLevelSlot;

  return normalized;
}

const spells = rawSpells.reduce((acc, spell) => {
  const normalized = normalizeSpell(spell);
  if (!normalized) return acc;
  const id = slugify(normalized.name);
  if (!id) return acc;
  acc[id] = normalized;
  return acc;
}, {});

export default spells;
