import { WEAPON_MASTERY_OPTION_MAP } from './weaponMasteryOptions';

const normalizeKey = (value) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

const RAW_ENTRIES = [
  { key: 'club', name: 'Club', category: 'simple melee', masteryId: 'sap' },
  { key: 'dagger', name: 'Dagger', category: 'simple melee', masteryId: 'nick' },
  {
    key: 'greatclub',
    name: 'Greatclub',
    category: 'simple melee',
    masteryId: 'push',
  },
  { key: 'handaxe', name: 'Handaxe', category: 'simple melee', masteryId: 'vex' },
  { key: 'javelin', name: 'Javelin', category: 'simple melee', masteryId: 'slow' },
  {
    key: 'light-hammer',
    name: 'Light Hammer',
    category: 'simple melee',
    masteryId: 'nick',
  },
  { key: 'mace', name: 'Mace', category: 'simple melee', masteryId: 'sap' },
  {
    key: 'quarterstaff',
    name: 'Quarterstaff',
    category: 'simple melee',
    masteryId: 'flex',
  },
  { key: 'sickle', name: 'Sickle', category: 'simple melee', masteryId: 'nick' },
  { key: 'spear', name: 'Spear', category: 'simple melee', masteryId: 'flex' },
  {
    key: 'light-crossbow',
    name: 'Light Crossbow',
    category: 'simple ranged',
    masteryId: 'slow',
  },
  { key: 'dart', name: 'Dart', category: 'simple ranged', masteryId: 'nick' },
  { key: 'shortbow', name: 'Shortbow', category: 'simple ranged', masteryId: 'vex' },
  { key: 'sling', name: 'Sling', category: 'simple ranged', masteryId: 'slow' },
  {
    key: 'battleaxe',
    name: 'Battleaxe',
    category: 'martial melee',
    masteryId: 'flex',
  },
  { key: 'flail', name: 'Flail', category: 'martial melee', masteryId: 'topple' },
  { key: 'glaive', name: 'Glaive', category: 'martial melee', masteryId: 'cleave' },
  { key: 'greataxe', name: 'Greataxe', category: 'martial melee', masteryId: 'cleave' },
  {
    key: 'greatsword',
    name: 'Greatsword',
    category: 'martial melee',
    masteryId: 'graze',
  },
  { key: 'halberd', name: 'Halberd', category: 'martial melee', masteryId: 'cleave' },
  { key: 'lance', name: 'Lance', category: 'martial melee', masteryId: 'topple' },
  {
    key: 'longsword',
    name: 'Longsword',
    category: 'martial melee',
    masteryId: 'flex',
  },
  { key: 'maul', name: 'Maul', category: 'martial melee', masteryId: 'topple' },
  {
    key: 'morningstar',
    name: 'Morningstar',
    category: 'martial melee',
    masteryId: 'topple',
  },
  { key: 'pike', name: 'Pike', category: 'martial melee', masteryId: 'push' },
  { key: 'rapier', name: 'Rapier', category: 'martial melee', masteryId: 'vex' },
  { key: 'scimitar', name: 'Scimitar', category: 'martial melee', masteryId: 'vex' },
  {
    key: 'shortsword',
    name: 'Shortsword',
    category: 'martial melee',
    masteryId: 'vex',
  },
  { key: 'trident', name: 'Trident', category: 'martial melee', masteryId: 'flex' },
  { key: 'war-pick', name: 'War Pick', category: 'martial melee', masteryId: 'topple' },
  {
    key: 'warhammer',
    name: 'Warhammer',
    category: 'martial melee',
    masteryId: 'push',
  },
  { key: 'whip', name: 'Whip', category: 'martial melee', masteryId: 'vex' },
  { key: 'blowgun', name: 'Blowgun', category: 'martial ranged', masteryId: 'sap' },
  {
    key: 'hand-crossbow',
    name: 'Hand Crossbow',
    category: 'martial ranged',
    masteryId: 'vex',
  },
  {
    key: 'heavy-crossbow',
    name: 'Heavy Crossbow',
    category: 'martial ranged',
    masteryId: 'slow',
  },
  { key: 'longbow', name: 'Longbow', category: 'martial ranged', masteryId: 'slow' },
  { key: 'net', name: 'Net', category: 'martial ranged', masteryId: 'slow' },
];

const catalog = {};
const nameLookup = new Map();
const categoryIndex = new Map();

RAW_ENTRIES.forEach(({ key, name, category, masteryId, aliases = [] }) => {
  const normalizedKey = normalizeKey(key || name);
  if (!normalizedKey) {
    return;
  }

  const mastery = WEAPON_MASTERY_OPTION_MAP[masteryId] || {
    title: masteryId,
    description: '',
  };

  const entry = {
    key: normalizedKey,
    label: name,
    category,
    masteryId,
    masteryTitle: mastery.title,
    masteryDescription: mastery.description,
  };

  catalog[normalizedKey] = entry;

  const registerName = (value) => {
    const normalized = normalizeKey(value);
    if (normalized && !nameLookup.has(normalized)) {
      nameLookup.set(normalized, normalizedKey);
    }
  };

  registerName(name);
  registerName(normalizedKey);
  aliases.forEach(registerName);

  const categoryKey = normalizeKey(category);
  if (categoryKey) {
    if (!categoryIndex.has(categoryKey)) {
      categoryIndex.set(categoryKey, []);
    }
    categoryIndex.get(categoryKey).push(entry);
  }
});

const sortByLabel = (a, b) => a.label.localeCompare(b.label);

export const WEAPON_MASTERY_CATALOG = catalog;

export const WEAPON_MASTERY_LIST = Object.values(catalog).sort(sortByLabel);

const proficiencyCategoryMap = {
  simple: ['simple-melee', 'simple-ranged'],
  martial: ['martial-melee', 'martial-ranged'],
};

const getCategoryEntries = (categoryKey) => {
  const normalized = normalizeKey(categoryKey);
  if (!normalized) return [];
  const direct = categoryIndex.get(normalized);
  if (direct) return [...direct];
  return [];
};

export const resolveWeaponMasteryKey = (value) => {
  if (!value) return '';
  const keyCandidate = normalizeKey(value);
  if (catalog[keyCandidate]) return keyCandidate;
  return nameLookup.get(keyCandidate) || '';
};

export const resolveWeaponMasteryEntry = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const key = resolveWeaponMasteryKey(value);
    return key ? catalog[key] : undefined;
  }
  if (typeof value === 'object') {
    const candidates = [
      value.type,
      value.weaponType,
      value.key,
      value.id,
      value.name,
      value.displayName,
      value.title,
    ];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'string') continue;
      const key = resolveWeaponMasteryKey(candidate);
      if (key) return catalog[key];
    }
  }
  return undefined;
};

export const resolveWeaponMasteryEntryFromWeapon = (weapon) =>
  resolveWeaponMasteryEntry(weapon);

export const getWeaponsForProficiency = (value) => {
  if (!value) return [];
  const normalized = normalizeKey(value).replace(/-?weapons?$/, '');
  const categories =
    proficiencyCategoryMap[normalized] || proficiencyCategoryMap[value];
  const entries = [];
  if (categories) {
    categories.forEach((categoryKey) => {
      getCategoryEntries(categoryKey).forEach((entry) => entries.push(entry));
    });
    return entries.sort(sortByLabel);
  }

  const direct = getCategoryEntries(normalized);
  if (direct.length) {
    return direct.sort(sortByLabel);
  }

  const fallbackKey = resolveWeaponMasteryKey(normalized);
  return fallbackKey ? [catalog[fallbackKey]] : [];
};

