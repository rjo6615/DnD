import { EQUIPMENT_SLOT_KEYS } from './equipmentSlots';

const cloneItem = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    return { name: item };
  }
  if (typeof item !== 'object') {
    return null;
  }
  return { ...item };
};

export const createEmptyEquipmentMap = () => {
  const slots = {};
  EQUIPMENT_SLOT_KEYS.forEach((slot) => {
    slots[slot] = null;
  });
  return slots;
};

const getAssignmentKey = (item) => {
  if (!item || typeof item !== 'object') return '';
  const identifier =
    item._id || item.id || item.name || item.displayName || item.title || '';
  const source = item.__source || item.source || '';
  return `${String(source).toLowerCase()}::${String(identifier).toLowerCase()}`;
};

export const normalizeEquipmentMap = (equipment, { fallback } = {}) => {
  const normalized = createEmptyEquipmentMap();
  const base =
    fallback && typeof fallback === 'object' ? fallback : undefined;

  if (base) {
    EQUIPMENT_SLOT_KEYS.forEach((slot) => {
      const baseValue = base[slot];
      normalized[slot] = baseValue ? cloneItem(baseValue) : null;
    });
  }

  if (!equipment || typeof equipment !== 'object') {
    return normalized;
  }

  const assigned = new Map();

  Object.entries(equipment).forEach(([slot, value]) => {
    if (!EQUIPMENT_SLOT_KEYS.includes(slot)) {
      return;
    }

    if (!value) {
      normalized[slot] = null;
      return;
    }

    const cloned = cloneItem(value);
    if (!cloned) {
      normalized[slot] = null;
      return;
    }

    const key = getAssignmentKey(cloned);
    if (key && assigned.has(key)) {
      const previousSlot = assigned.get(key);
      if (previousSlot && previousSlot !== slot) {
        normalized[previousSlot] = null;
      }
    }

    normalized[slot] = cloned;
    if (key) {
      assigned.set(key, slot);
    }
  });

  return normalized;
};
