import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Nav,
  Row,
  Spinner,
  Tab,
} from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import {
  normalizeAccessories,
  normalizeArmor,
  normalizeItems,
  normalizeWeapons,
} from './inventoryNormalization';

const SHOP_TABS = [
  { key: 'weapons', title: 'Weapons' },
  { key: 'armor', title: 'Armor' },
  { key: 'items', title: 'Items' },
  { key: 'accessories', title: 'Accessories' },
];

const createEmptyHiddenState = () => ({
  weapons: [],
  armor: [],
  items: [],
  accessories: [],
});

const normalizeKey = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
};

const toHtmlId = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[^a-z0-9_-]/g, '-');
};

const collectHiddenEntries = (value) => {
  const normalized = new Set();
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      const key = normalizeKey(entry);
      if (key) {
        normalized.add(key);
      }
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([entryKey, hidden]) => {
      if (hidden === true) {
        const key = normalizeKey(entryKey);
        if (key) {
          normalized.add(key);
        }
      }
    });
  }
  return Array.from(normalized).sort();
};

const normalizeHiddenState = (input) => {
  const state = createEmptyHiddenState();
  SHOP_TABS.forEach(({ key }) => {
    state[key] = collectHiddenEntries(input?.[key]);
  });
  return state;
};

const hiddenStatesEqual = (stateA, stateB) =>
  SHOP_TABS.every(({ key }) => {
    const setA = new Set(Array.isArray(stateA[key]) ? stateA[key] : []);
    const setB = new Set(Array.isArray(stateB[key]) ? stateB[key] : []);
    if (setA.size !== setB.size) {
      return false;
    }
    for (const entry of setA) {
      if (!setB.has(entry)) {
        return false;
      }
    }
    return true;
  });

const fetchJsonOrThrow = async (url, defaultMessage) => {
  const response = await apiFetch(url);
  if (response.ok) {
    return response.json();
  }
  let message = defaultMessage || response.statusText || 'Request failed';
  try {
    const errorBody = await response.json();
    if (errorBody && typeof errorBody.message === 'string') {
      message = errorBody.message;
    }
  } catch (error) {
    // ignore JSON parse errors
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
};

const fetchJsonWithFallback = async (url, fallbackValue = []) => {
  const response = await apiFetch(url);
  if (response.ok) {
    try {
      return await response.json();
    } catch (error) {
      if (response.status === 204 || response.headers.get('Content-Length') === '0') {
        return fallbackValue;
      }
      throw error;
    }
  }
  if (response.status === 404) {
    return fallbackValue;
  }
  let message = response.statusText || 'Request failed';
  try {
    const errorBody = await response.json();
    if (errorBody && typeof errorBody.message === 'string') {
      message = errorBody.message;
    }
  } catch (error) {
    // ignore JSON parse errors
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
};

const toTitleCase = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .split(/\s+|_/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const resolveFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return '';
};

const cloneInventoryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }
  try {
    return JSON.parse(JSON.stringify(entry));
  } catch (error) {
    return { ...entry };
  }
};

const createInventoryCopies = (entry, quantity, extras = {}) => {
  const normalizedQuantity = Math.max(
    1,
    Number.isFinite(quantity) ? quantity : Number.parseInt(quantity, 10) || 1
  );
  const copies = [];
  for (let index = 0; index < normalizedQuantity; index += 1) {
    let clone = cloneInventoryEntry(entry);
    if (!clone || typeof clone !== 'object') {
      clone = {};
    }
    copies.push({ ...clone, ...extras });
  }
  return copies;
};

const createWeaponInventoryPayload = (weapon, fallbackName, source) => {
  if (!weapon) {
    return null;
  }
  const resolvedName = resolveFirstString(
    weapon.name,
    weapon.displayName,
    weapon.weaponName,
    fallbackName
  );
  if (!resolvedName) {
    return null;
  }
  const base = {
    ...weapon,
    name: resolvedName,
  };
  if (base.weaponName && base.displayName === undefined) {
    base.displayName = base.weaponName;
  }
  if (base.weaponType !== undefined && base.type === undefined) {
    base.type = base.weaponType;
  }
  const [normalized] = normalizeWeapons([base], { includeUnowned: true });
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    ...(source ? { source } : {}),
  };
};

const createArmorInventoryPayload = (armor, fallbackName, source) => {
  if (!armor) {
    return null;
  }
  const resolvedName = resolveFirstString(
    armor.name,
    armor.armorName,
    armor.displayName,
    fallbackName
  );
  if (!resolvedName) {
    return null;
  }
  const base = {
    ...armor,
    name: resolvedName,
  };
  if (!base.displayName && armor.armorName) {
    base.displayName = armor.armorName;
  }
  if (base.armorType !== undefined && base.type === undefined) {
    base.type = base.armorType;
  }
  const [normalized] = normalizeArmor([base], { includeUnowned: true });
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    ...(source ? { source } : {}),
  };
};

const createItemInventoryPayload = (item, fallbackName, source) => {
  if (!item) {
    return null;
  }
  const resolvedName = resolveFirstString(
    item.name,
    item.itemName,
    item.displayName,
    fallbackName
  );
  if (!resolvedName) {
    return null;
  }
  const base = {
    ...item,
    name: resolvedName,
  };
  if (!base.displayName && item.itemName) {
    base.displayName = item.itemName;
  }
  const [normalized] = normalizeItems([base], { includeUnowned: true });
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    ...(source ? { source } : {}),
  };
};

const createAccessoryInventoryPayload = (accessory, fallbackName, source) => {
  if (!accessory) {
    return null;
  }
  const resolvedName = resolveFirstString(
    accessory.name,
    accessory.accessoryName,
    accessory.displayName,
    fallbackName
  );
  if (!resolvedName) {
    return null;
  }
  const base = {
    ...accessory,
    name: resolvedName,
  };
  if (!base.displayName && accessory.accessoryName) {
    base.displayName = accessory.accessoryName;
  }
  const [normalized] = normalizeAccessories([base], { includeUnowned: true });
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    ...(source ? { source } : {}),
  };
};

const resolveCharacterId = (character) => {
  if (!character || typeof character !== 'object') {
    return null;
  }
  const candidates = [character._id, character.characterId, character.id];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return null;
};

const resolveCharacterLabel = (character) => {
  if (!character || typeof character !== 'object') {
    return 'Unnamed Character';
  }
  const name = resolveFirstString(
    character.characterName,
    character.name,
    character.CharacterName
  );
  const player = resolveFirstString(character.token, character.player, character.username);
  if (name && player) {
    return `${name} (${player})`;
  }
  return name || player || 'Unnamed Character';
};

const DEFAULT_ADD_MODAL_STATE = {
  show: false,
  category: '',
  item: null,
  characterId: '',
  quantity: '1',
  submitting: false,
  error: null,
};

const readErrorMessage = async (response, fallback = 'Request failed.') => {
  if (!response) {
    return fallback;
  }
  let message = fallback;
  try {
    const data = await response.json();
    if (data && typeof data.message === 'string' && data.message.trim()) {
      message = data.message.trim();
    }
  } catch (error) {
    // ignore JSON parse errors
  }
  if (!message && response.statusText) {
    message = response.statusText;
  }
  return message || fallback;
};

const buildWeaponCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, weapon]) => {
      if (!weapon) {
        return;
      }
      const normalizedKey = normalizeKey(key || weapon.name);
      if (!normalizedKey) {
        return;
      }
      const displayName = weapon.displayName || weapon.name || key;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: weapon.category || '',
        cost: weapon.cost ?? '',
        damage: weapon.damage ?? '',
        properties: normalizeArrayField(weapon.properties),
        source: 'Standard',
        inventoryPayload: createWeaponInventoryPayload(
          weapon,
          displayName,
          'Standard'
        ),
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((weapon) => {
      if (!weapon) {
        return;
      }
      const rawName = weapon.name || weapon.weaponName;
      const normalizedKey = normalizeKey(rawName);
      if (!normalizedKey) {
        return;
      }
      const displayName =
        weapon.displayName || weapon.name || weapon.weaponName || rawName;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: weapon.category || weapon.type || 'custom',
        cost: weapon.cost ?? '',
        damage: weapon.damage ?? '',
        properties: normalizeArrayField(weapon.properties),
        source: 'Custom',
        inventoryPayload: createWeaponInventoryPayload(
          weapon,
          displayName,
          'Custom'
        ),
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const buildArmorCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, armor]) => {
      if (!armor) {
        return;
      }
      const normalizedKey = normalizeKey(key || armor.name);
      if (!normalizedKey) {
        return;
      }
      const displayName = armor.displayName || armor.name || key;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: armor.category || '',
        cost: armor.cost ?? '',
        armorClass: armor.acBonus ?? armor.ac ?? '',
        maxDex: armor.maxDex ?? null,
        strength: armor.strength ?? null,
        stealth: armor.stealth ?? false,
        source: 'Standard',
        inventoryPayload: createArmorInventoryPayload(
          armor,
          displayName,
          'Standard'
        ),
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((armor) => {
      if (!armor) {
        return;
      }
      const rawName = armor.name || armor.armorName;
      const normalizedKey = normalizeKey(rawName);
      if (!normalizedKey) {
        return;
      }
      const displayName = armor.name || armor.armorName || rawName;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: armor.category || armor.type || 'custom',
        cost: armor.cost ?? '',
        armorClass: armor.acBonus ?? armor.armorBonus ?? armor.ac ?? '',
        maxDex: armor.maxDex ?? null,
        strength: armor.strength ?? null,
        stealth: armor.stealth ?? false,
        source: 'Custom',
        inventoryPayload: createArmorInventoryPayload(
          armor,
          displayName,
          'Custom'
        ),
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const buildItemCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, item]) => {
      if (!item) {
        return;
      }
      const normalizedKey = normalizeKey(key || item.name);
      if (!normalizedKey) {
        return;
      }
      const displayName = item.displayName || item.name || key;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: item.category || '',
        cost: item.cost ?? '',
        weight: item.weight ?? '',
        notes: item.notes || '',
        source: 'Standard',
        inventoryPayload: createItemInventoryPayload(
          item,
          displayName,
          'Standard'
        ),
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((item) => {
      if (!item) {
        return;
      }
      const normalizedKey = normalizeKey(item.name);
      if (!normalizedKey) {
        return;
      }
      const displayName = item.name;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: item.category || 'custom',
        cost: item.cost ?? '',
        weight: item.weight ?? '',
        notes: item.notes || '',
        source: 'Custom',
        inventoryPayload: createItemInventoryPayload(
          item,
          displayName,
          'Custom'
        ),
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const buildAccessoryCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, accessory]) => {
      if (!accessory) {
        return;
      }
      const normalizedKey = normalizeKey(key || accessory.name);
      if (!normalizedKey) {
        return;
      }
      const displayName = accessory.displayName || accessory.name || key;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: accessory.category || '',
        cost: accessory.cost ?? '',
        targetSlots: normalizeArrayField(accessory.targetSlots),
        rarity: accessory.rarity || '',
        source: 'Standard',
        inventoryPayload: createAccessoryInventoryPayload(
          accessory,
          displayName,
          'Standard'
        ),
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((accessory) => {
      if (!accessory) {
        return;
      }
      const normalizedKey = normalizeKey(accessory.name);
      if (!normalizedKey) {
        return;
      }
      const displayName = accessory.name;
      map.set(normalizedKey, {
        key: normalizedKey,
        name: displayName,
        category: accessory.category || 'custom',
        cost: accessory.cost ?? '',
        targetSlots: normalizeArrayField(accessory.targetSlots),
        rarity: accessory.rarity || '',
        source: 'Custom',
        inventoryPayload: createAccessoryInventoryPayload(
          accessory,
          displayName,
          'Custom'
        ),
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

export default function ShopVisibilityManager({
  campaign,
  active,
  onStatus,
  characters,
  onInventoryUpdate,
}) {
  const [activeTabKey, setActiveTabKey] = useState('weapons');
  const [hiddenState, setHiddenState] = useState(() => createEmptyHiddenState());
  const [initialHiddenState, setInitialHiddenState] = useState(() =>
    createEmptyHiddenState()
  );
  const [inventory, setInventory] = useState({
    weapons: [],
    armor: [],
    items: [],
    accessories: [],
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [addModalState, setAddModalState] = useState(DEFAULT_ADD_MODAL_STATE);

  useEffect(() => {
    setHiddenState(createEmptyHiddenState());
    setInitialHiddenState(createEmptyHiddenState());
    setInventory({ weapons: [], armor: [], items: [], accessories: [] });
    setLoading(false);
    setInitialized(false);
    setError(null);
  }, [campaign]);

  useEffect(() => {
    if (!active || !campaign || initialized) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const encodedCampaign = encodeURIComponent(campaign);
        const [
          visibilityData,
          standardWeapons,
          customWeapons,
          standardArmor,
          customArmor,
          standardItems,
          customItems,
          standardAccessories,
          customAccessories,
        ] = await Promise.all([
          fetchJsonWithFallback(
            `/campaigns/${encodedCampaign}/shop-visibility`,
            createEmptyHiddenState()
          ),
          fetchJsonOrThrow('/weapons', 'Failed to load weapons.'),
          fetchJsonWithFallback(`/equipment/weapons/${encodedCampaign}`),
          fetchJsonOrThrow('/armor', 'Failed to load armor.'),
          fetchJsonWithFallback(`/equipment/armor/${encodedCampaign}`),
          fetchJsonOrThrow('/items', 'Failed to load items.'),
          fetchJsonWithFallback(`/equipment/items/${encodedCampaign}`),
          fetchJsonOrThrow('/accessories', 'Failed to load accessories.'),
          fetchJsonWithFallback(`/equipment/accessories/${encodedCampaign}`),
        ]);

        if (cancelled) {
          return;
        }

        setInventory({
          weapons: buildWeaponCatalog(standardWeapons, customWeapons),
          armor: buildArmorCatalog(standardArmor, customArmor),
          items: buildItemCatalog(standardItems, customItems),
          accessories: buildAccessoryCatalog(standardAccessories, customAccessories),
        });

        const normalizedHidden = normalizeHiddenState(visibilityData);
        setHiddenState(normalizedHidden);
        setInitialHiddenState(normalizedHidden);
        setError(null);
        setInitialized(true);
      } catch (err) {
        if (cancelled) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error('Failed to load shop visibility', err);
        const message = err?.message || 'Failed to load shop inventory.';
        setError({ message });
        if (typeof onStatus === 'function') {
          onStatus({ type: 'danger', message });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [active, campaign, initialized, onStatus]);

  const characterLookup = useMemo(() => {
    const map = new Map();
    if (Array.isArray(characters)) {
      characters.forEach((character) => {
        const id = resolveCharacterId(character);
        if (id && !map.has(id)) {
          map.set(id, character);
        }
      });
    }
    return map;
  }, [characters]);

  const characterOptions = useMemo(() => {
    const options = [];
    characterLookup.forEach((character, id) => {
      options.push({ id, label: resolveCharacterLabel(character) });
    });
    return options.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    );
  }, [characterLookup]);

  const hiddenSets = useMemo(() => {
    const sets = {};
    SHOP_TABS.forEach(({ key }) => {
      sets[key] = new Set(Array.isArray(hiddenState[key]) ? hiddenState[key] : []);
    });
    return sets;
  }, [hiddenState]);

  const hasChanges = useMemo(
    () => !hiddenStatesEqual(hiddenState, initialHiddenState),
    [hiddenState, initialHiddenState]
  );

  const openAddInventoryModal = useCallback(
    (category, item) => {
      if (!item || !item.inventoryPayload) {
        return;
      }
      setAddModalState((prev) => {
        const defaultId =
          prev.characterId &&
          characterOptions.some((option) => option.id === prev.characterId)
            ? prev.characterId
            : characterOptions[0]?.id || '';
        return {
          ...DEFAULT_ADD_MODAL_STATE,
          show: true,
          category,
          item,
          characterId: defaultId,
        };
      });
    },
    [characterOptions]
  );

  const closeAddInventoryModal = useCallback(() => {
    setAddModalState({ ...DEFAULT_ADD_MODAL_STATE });
  }, []);

  const handleConfirmAdd = useCallback(
    async (event) => {
      event.preventDefault();
      const { category, item, characterId, quantity } = addModalState;
      setAddModalState((prev) => ({ ...prev, submitting: true, error: null }));
      try {
        if (!item || !item.inventoryPayload) {
          throw new Error('Item details are unavailable.');
        }
        const trimmedCharacterId =
          typeof characterId === 'string' ? characterId.trim() : '';
        if (!trimmedCharacterId) {
          throw new Error('Select a player character.');
        }
        const character = characterLookup.get(trimmedCharacterId);
        if (!character) {
          throw new Error('Character not found.');
        }
        const quantityValue = Math.min(
          99,
          Math.max(1, Number.parseInt(quantity, 10) || 1)
        );
        const additions = createInventoryCopies(item.inventoryPayload, quantityValue, {
          owned: true,
        });
        if (!additions.length) {
          throw new Error('Unable to prepare item for inventory.');
        }

        let endpoint = '';
        let bodyKey = '';
        let updatedInventory = [];

        if (category === 'weapons') {
          const existing = normalizeWeapons(
            Array.isArray(character.weapon) ? character.weapon : [],
            { includeUnowned: true }
          );
          updatedInventory = [...existing, ...additions];
          endpoint = `/equipment/update-weapon/${encodeURIComponent(trimmedCharacterId)}`;
          bodyKey = 'weapon';
        } else if (category === 'armor') {
          const existing = normalizeArmor(
            Array.isArray(character.armor) ? character.armor : [],
            { includeUnowned: true }
          );
          updatedInventory = [...existing, ...additions];
          endpoint = `/equipment/update-armor/${encodeURIComponent(trimmedCharacterId)}`;
          bodyKey = 'armor';
        } else if (category === 'items') {
          const existing = normalizeItems(
            Array.isArray(character.item) ? character.item : [],
            { includeUnowned: true }
          );
          updatedInventory = [...existing, ...additions];
          endpoint = `/equipment/update-item/${encodeURIComponent(trimmedCharacterId)}`;
          bodyKey = 'item';
        } else if (category === 'accessories') {
          const accessorySource = Array.isArray(character.accessories)
            ? character.accessories
            : Array.isArray(character.accessory)
              ? character.accessory
              : [];
          const existing = normalizeAccessories(accessorySource, {
            includeUnowned: true,
          });
          updatedInventory = [...existing, ...additions];
          endpoint = `/equipment/update-accessories/${encodeURIComponent(
            trimmedCharacterId
          )}`;
          bodyKey = 'accessories';
        } else {
          throw new Error('Unsupported item type.');
        }

        const response = await apiFetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [bodyKey]: updatedInventory }),
        });

        if (!response.ok) {
          const message = await readErrorMessage(
            response,
            'Failed to update inventory.'
          );
          throw new Error(message);
        }

        if (typeof onInventoryUpdate === 'function') {
          await onInventoryUpdate();
        }

        if (typeof onStatus === 'function') {
          const label = resolveCharacterLabel(character);
          const itemName = item.inventoryPayload?.name || item.name || 'Item';
          onStatus({
            type: 'success',
            message: `${itemName} added to ${label}'s inventory.`,
          });
        }

        setAddModalState({ ...DEFAULT_ADD_MODAL_STATE });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to add item to inventory', error);
        const message = error?.message || 'Failed to add item to inventory.';
        setAddModalState((prev) => ({
          ...prev,
          submitting: false,
          error: message,
        }));
        if (typeof onStatus === 'function') {
          onStatus({ type: 'danger', message });
        }
      }
    },
    [addModalState, characterLookup, onInventoryUpdate, onStatus]
  );

  const handleToggleItem = useCallback((category, key, visible) => {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) {
      return;
    }
    setHiddenState((prev) => {
      const current = Array.isArray(prev[category]) ? prev[category] : [];
      const set = new Set(current);
      if (visible) {
        set.delete(normalizedKey);
      } else {
        set.add(normalizedKey);
      }
      return { ...prev, [category]: Array.from(set).sort() };
    });
  }, []);

  const handleToggleAll = useCallback((category, shouldShowAll, keys) => {
    setHiddenState((prev) => ({
      ...prev,
      [category]: shouldShowAll
        ? []
        : keys
            .map((entry) => normalizeKey(entry))
            .filter(Boolean)
            .sort(),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!campaign) {
      return;
    }
    const encodedCampaign = encodeURIComponent(campaign);
    const payload = SHOP_TABS.reduce((acc, { key }) => {
      acc[key] = Array.isArray(hiddenState[key])
        ? Array.from(new Set(hiddenState[key])).filter(Boolean)
        : [];
      return acc;
    }, {});

    setSaving(true);
    try {
      const response = await apiFetch(
        `/campaigns/${encodedCampaign}/shop-visibility`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        let message = response.statusText || 'Failed to update shop visibility.';
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.message === 'string') {
            message = errorBody.message;
          }
        } catch (error) {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
      const data = await response.json();
      const normalized = normalizeHiddenState(data);
      setHiddenState(normalized);
      setInitialHiddenState(normalized);
      setError(null);
      if (typeof onStatus === 'function') {
        onStatus({ type: 'success', message: 'Shop visibility updated.' });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save shop visibility', err);
      const message = err?.message || 'Failed to update shop visibility.';
      setError({ message });
      if (typeof onStatus === 'function') {
        onStatus({ type: 'danger', message });
      }
    } finally {
      setSaving(false);
    }
  }, [campaign, hiddenState, onStatus]);

  const renderCategory = useCallback(
    (category) => {
    const entries = Array.isArray(inventory[category]) ? inventory[category] : [];
    const hiddenSet = hiddenSets[category] || new Set();
    const total = entries.length;
    const visibleCount = entries.reduce(
      (count, entry) => (hiddenSet.has(entry.key) ? count : count + 1),
      0
    );
    const allVisible = total > 0 && visibleCount === total;
    const noneVisible = total > 0 && visibleCount === 0;
    const allKeys = entries.map((entry) => entry.key);

      if (loading && total === 0) {
        return (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" role="status" />
            <span className="visually-hidden">Loading shop inventory…</span>
          </div>
        );
      }

      if (!loading && total === 0) {
        return <div className="text-center text-muted py-4">No items available.</div>;
      }

      return (
        <>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <Form.Check
                type="checkbox"
                id={`${category}-select-all`}
                label="Select All"
                checked={allVisible}
                onChange={(event) =>
                  handleToggleAll(category, event.target.checked, allKeys)
                }
                disabled={loading || saving || total === 0}
              />
              <Form.Check
                type="checkbox"
                id={`${category}-deselect-all`}
                label="Deselect All"
                checked={noneVisible}
                onChange={(event) =>
                  handleToggleAll(category, !event.target.checked, allKeys)
                }
                disabled={loading || saving || total === 0}
              />
            </div>
            <div className="text-muted small">
              Showing {visibleCount} of {total}
            </div>
          </div>
          <Row className="row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            {entries.map((item) => {
              const visible = !hiddenSet.has(item.key);
              const canAddItem = Boolean(item.inventoryPayload);
              let addButtonDisabled = addModalState.submitting;
              let addButtonTitle;
              if (!canAddItem) {
                addButtonDisabled = true;
                addButtonTitle = 'This item cannot be added to inventory.';
              } else if (characterOptions.length === 0) {
                addButtonDisabled = true;
                addButtonTitle = 'No player characters available.';
              }
              return (
                <Col key={`${category}-${item.key}`} className="d-flex">
                  <Card className="flex-grow-1 h-100 bg-dark bg-opacity-75 border border-secondary text-light">
                    <Card.Body className="d-flex flex-column gap-2">
                      <div>
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <Card.Title className="h5 mb-1">{item.name}</Card.Title>
                            <Card.Subtitle className="text-muted text-uppercase small">
                              {item.category ? toTitleCase(item.category) : '—'}
                            </Card.Subtitle>
                          </div>
                          <Badge bg={item.source === 'Custom' ? 'info' : 'secondary'}>
                            {item.source}
                          </Badge>
                        </div>
                        {item.damage !== undefined && (
                          <Card.Text className="mb-1">Damage: {item.damage || '—'}</Card.Text>
                        )}
                        {item.properties !== undefined && (
                          <Card.Text className="mb-1">
                            Properties:{' '}
                            {item.properties && item.properties.length > 0
                              ? item.properties.join(', ')
                              : '—'}
                          </Card.Text>
                        )}
                        {item.armorClass !== undefined && (
                          <Card.Text className="mb-1">
                            AC Bonus: {item.armorClass || '—'}
                          </Card.Text>
                        )}
                        {item.maxDex !== undefined && (
                          <Card.Text className="mb-1">
                            Max Dex: {item.maxDex === null ? '—' : item.maxDex}
                          </Card.Text>
                        )}
                        {item.strength !== undefined && (
                          <Card.Text className="mb-1">
                            Strength: {item.strength === null ? '—' : item.strength}
                          </Card.Text>
                        )}
                        {item.stealth !== undefined && (
                          <Card.Text className="mb-1">
                            Stealth: {item.stealth ? 'Disadvantage' : '—'}
                          </Card.Text>
                        )}
                        {item.weight !== undefined && (
                          <Card.Text className="mb-1">
                            Weight: {item.weight === '' || item.weight === null ? '—' : item.weight}
                          </Card.Text>
                        )}
                        {item.targetSlots !== undefined && (
                          <Card.Text className="mb-1">
                            Slots:{' '}
                            {item.targetSlots && item.targetSlots.length > 0
                              ? item.targetSlots.map(toTitleCase).join(', ')
                              : '—'}
                          </Card.Text>
                        )}
                        {item.rarity !== undefined && (
                          <Card.Text className="mb-1">
                            Rarity: {item.rarity ? toTitleCase(item.rarity) : '—'}
                          </Card.Text>
                        )}
                        <Card.Text className="mb-1">Cost: {item.cost || '—'}</Card.Text>
                        {item.notes ? (
                          <Card.Text className="small text-muted mb-0">
                            {item.notes}
                          </Card.Text>
                        ) : null}
                      </div>
                      <div className="mt-auto">
                        <div className="d-flex flex-column gap-2">
                          <Form.Check
                            type="checkbox"
                            id={`${category}-visibility-${toHtmlId(item.key)}`}
                            label="Visible in player shop"
                            checked={visible}
                            onChange={(event) =>
                              handleToggleItem(category, item.key, event.target.checked)
                            }
                            disabled={saving}
                          />
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => openAddInventoryModal(category, item)}
                            disabled={addButtonDisabled}
                            title={addButtonTitle}
                          >
                            Add to Inventory
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      );
    },
    [
      addModalState.submitting,
      characterOptions,
      handleToggleAll,
      handleToggleItem,
      hiddenSets,
      inventory,
      loading,
      openAddInventoryModal,
      saving,
    ]
  );

  const selectedCharacterValid = characterOptions.some(
    (option) => option.id === addModalState.characterId
  );
  const canSubmitAddModal =
    Boolean(addModalState.item?.inventoryPayload) &&
    selectedCharacterValid &&
    !addModalState.submitting;
  const modalItemName =
    addModalState.item?.inventoryPayload?.name ||
    addModalState.item?.name ||
    'this item';
  const modalCategoryLabel = toTitleCase(addModalState.category);

  return (
    <div>
      {error ? <Alert variant="danger">{error.message}</Alert> : null}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="text-muted small">
          Choose which items are available to players in the shop.
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!initialized || saving || !hasChanges}
        >
          {saving ? (
            <span className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" role="status" />
              <span>Saving…</span>
            </span>
          ) : (
            'Save Visibility'
          )}
        </Button>
      </div>
      <Tab.Container activeKey={activeTabKey} onSelect={(key) => key && setActiveTabKey(key)}>
        <div className="d-flex justify-content-center mb-3">
          <Nav variant="tabs" className="flex-wrap">
            {SHOP_TABS.map(({ key, title }) => (
              <Nav.Item key={key}>
                <Nav.Link eventKey={key}>{title}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
        <Tab.Content>
          {SHOP_TABS.map(({ key }) => (
            <Tab.Pane eventKey={key} key={key}>
              {renderCategory(key)}
            </Tab.Pane>
          ))}
        </Tab.Content>
      </Tab.Container>
      <Modal show={addModalState.show} onHide={closeAddInventoryModal} centered>
        <Form onSubmit={handleConfirmAdd}>
          <Modal.Header closeButton>
            <Modal.Title>Add to Inventory</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-3">
              Choose a player character to receive{' '}
              <span className="fw-semibold">{modalItemName}</span>
              {modalCategoryLabel ? ` (${modalCategoryLabel})` : ''}.
            </p>
            {characterOptions.length === 0 ? (
              <Alert variant="info">No player characters are available for this campaign.</Alert>
            ) : null}
            <Form.Group className="mb-3" controlId="add-inventory-character">
              <Form.Label>Player Character</Form.Label>
              <Form.Select
                value={addModalState.characterId}
                onChange={(event) =>
                  setAddModalState((prev) => ({
                    ...prev,
                    characterId: event.target.value,
                  }))
                }
                disabled={characterOptions.length === 0 || addModalState.submitting}
              >
                {characterOptions.length === 0 ? (
                  <option value="">No characters available</option>
                ) : (
                  characterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                )}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="add-inventory-quantity">
              <Form.Label>Quantity</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={99}
                value={addModalState.quantity}
                onChange={(event) =>
                  setAddModalState((prev) => ({
                    ...prev,
                    quantity: event.target.value,
                  }))
                }
                disabled={addModalState.submitting}
              />
              <Form.Text className="text-muted">
                Adds the selected item this many times.
              </Form.Text>
            </Form.Group>
            {addModalState.error ? (
              <Alert variant="danger">{addModalState.error}</Alert>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={closeAddInventoryModal}
              disabled={addModalState.submitting}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!canSubmitAddModal}>
              {addModalState.submitting ? 'Adding…' : 'Add Item'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

ShopVisibilityManager.defaultProps = {
  campaign: '',
  active: false,
  onStatus: () => {},
  characters: [],
  onInventoryUpdate: null,
};
