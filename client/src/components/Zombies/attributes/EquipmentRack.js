import React, { useMemo, useCallback } from 'react';
import { Form, Button } from 'react-bootstrap';
import { EQUIPMENT_SLOT_LAYOUT } from './equipmentSlots';
import styles from './EquipmentRack.module.scss';

const FLAT_SLOTS = EQUIPMENT_SLOT_LAYOUT.flat();

const DEFAULT_ALLOWED_SOURCES = ['weapon', 'armor', 'item'];

const DESCRIPTOR_KEYS = [
  'category',
  'categories',
  'type',
  'types',
  'slot',
  'slots',
  'tags',
  'subtype',
  'subType',
  'equipmentSlot',
  'equipmentSlots',
];

const toLowercaseStrings = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry === 'string' && entry.trim().length)
      .map((entry) => entry.toLowerCase());
  }
  if (typeof value === 'string') {
    return value.trim().length ? [value.toLowerCase()] : [];
  }
  return [];
};

const getItemDescriptors = (item) => {
  if (!item || typeof item !== 'object') return [];
  const descriptors = new Set();
  DESCRIPTOR_KEYS.forEach((key) => {
    toLowercaseStrings(item[key]).forEach((descriptor) => {
      descriptors.add(descriptor);
    });
  });
  return Array.from(descriptors);
};

const matchesAllowedValues = (descriptors, allowedValues = []) => {
  if (!allowedValues || allowedValues.length === 0) return true;
  if (!descriptors || descriptors.length === 0) return true;
  return allowedValues.some((allowed) => {
    const normalized = allowed.toLowerCase();
    return descriptors.some((descriptor) => descriptor.includes(normalized));
  });
};

const slotAllowsOption = (slot, option) => {
  if (!slot || !option) return false;
  const allowedSources =
    slot.allowedSources && slot.allowedSources.length
      ? slot.allowedSources
      : DEFAULT_ALLOWED_SOURCES;
  if (!allowedSources.includes(option.source)) {
    return false;
  }

  const sourceFilters = slot.filters?.[option.source];
  if (!sourceFilters) {
    return true;
  }

  const descriptors = getItemDescriptors(option.item);

  if (
    sourceFilters.categories &&
    !matchesAllowedValues(descriptors, sourceFilters.categories)
  ) {
    return false;
  }

  if (sourceFilters.types && !matchesAllowedValues(descriptors, sourceFilters.types)) {
    return false;
  }

  return true;
};

const buildSlotOptions = (slot, optionsBySource) => {
  if (!slot) return [];
  const allowedSources =
    slot.allowedSources && slot.allowedSources.length
      ? slot.allowedSources
      : DEFAULT_ALLOWED_SOURCES;
  const options = [];
  allowedSources.forEach((source) => {
    const sourceOptions = optionsBySource[source] || [];
    sourceOptions.forEach((option) => {
      if (slotAllowsOption(slot, option)) {
        options.push(option);
      }
    });
  });
  return options;
};

const SLOT_LAYOUT = {
  leftColumn: ['head', 'eyes', 'neck', 'shoulders', 'chest', 'back'],
  rightColumn: ['arms', 'wrists', 'hands', 'waist', 'legs', 'feet'],
  bottomRow: ['mainHand', 'offHand', 'ranged', 'ringLeft', 'ringRight'],
};

const SLOT_ICONS = {
  head: '🪖',
  eyes: '👁️',
  neck: '🧿',
  shoulders: '🛡️',
  chest: '👕',
  back: '🎒',
  arms: '💪',
  wrists: '⛓️',
  hands: '🧤',
  waist: '🧷',
  legs: '🦵',
  feet: '🥾',
  mainHand: '⚔️',
  offHand: '🛡️',
  ranged: '🏹',
  ringLeft: '💍',
  ringRight: '💍',
};

const getItemName = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item !== 'object') return String(item);
  return item.displayName || item.name || item.title || '';
};

const getItemSource = (item) => {
  if (!item || typeof item !== 'object') return undefined;
  if (item.source) return item.source;
  if (item.__source) return item.__source;
  if (item.reference && item.reference.source) return item.reference.source;
  return undefined;
};

export default function EquipmentRack({
  equipment = {},
  inventory = {},
  onEquipmentChange,
  onSlotChange,
  disabled = false,
}) {
  const { weapons = [], armor = [], items = [] } = inventory || {};
  const slotLookup = useMemo(() => {
    const map = new Map();
    FLAT_SLOTS.forEach((slot) => {
      map.set(slot.key, slot);
    });
    return map;
  }, []);
  const inventoryOptions = useMemo(() => {
    const options = [];
    const bySource = {};
    const addOptions = (itemsList = [], source) => {
      if (!itemsList || itemsList.length === 0) return;
      if (!bySource[source]) {
        bySource[source] = [];
      }
      itemsList.forEach((item, index) => {
        if (!item) return;
        const name = getItemName(item);
        if (!name) return;
        const value = `${source}-${index}-${name}`;
        const option = {
          value,
          label: name,
          item,
          source,
          description:
            source === 'weapon'
              ? 'Weapon'
              : source === 'armor'
              ? 'Armor'
              : 'Item',
        };
        options.push(option);
        bySource[source].push(option);
      });
    };

    addOptions(weapons, 'weapon');
    addOptions(armor, 'armor');
    addOptions(items, 'item');

    return { all: options, bySource };
  }, [armor, items, weapons]);

  const optionMap = useMemo(() => {
    const map = new Map();
    inventoryOptions.all.forEach((opt) => {
      map.set(opt.value, opt);
    });
    return map;
  }, [inventoryOptions]);

  const slotOptionsMap = useMemo(() => {
    const map = new Map();
    FLAT_SLOTS.forEach((slot) => {
      map.set(slot.key, buildSlotOptions(slot, inventoryOptions.bySource));
    });
    return map;
  }, [inventoryOptions]);

  const hasOptions = inventoryOptions.all.length > 0;

  const handleAssign = useCallback(
    (slotKey, optionValue) => {
      if (typeof onEquipmentChange !== 'function' && typeof onSlotChange !== 'function')
        return;

      let nextItem = null;
      if (optionValue) {
        const option = optionMap.get(optionValue);
        if (option) {
          const base =
            option.item && typeof option.item === 'object'
              ? { ...option.item }
              : { name: getItemName(option.item) };
          nextItem = {
            ...base,
            source: option.source,
            __source: option.source,
          };
        }
      }

      const nextEquipment = { ...equipment };
      if (nextItem) {
        nextEquipment[slotKey] = nextItem;
      } else {
        nextEquipment[slotKey] = null;
      }

      if (typeof onSlotChange === 'function') {
        onSlotChange(slotKey, nextItem || null);
      }
      if (typeof onEquipmentChange === 'function') {
        onEquipmentChange(nextEquipment);
      }
    },
    [equipment, onEquipmentChange, onSlotChange, optionMap]
  );

  const renderSlot = (slot) => {
    if (!slot) return null;
    const current = equipment?.[slot.key];
    const optionsForSlot = slotOptionsMap.get(slot.key) || [];
    const selectedOption = optionsForSlot.find((opt) => {
      const itemName = getItemName(current);
      if (!itemName) return false;
      const currentSource = getItemSource(current);
      const candidateName = getItemName(opt.item);
      if (currentSource) {
        return opt.source === currentSource && candidateName === itemName;
      }
      return candidateName === itemName;
    });

    const selectedValue = selectedOption ? selectedOption.value : '';
    const displayName = getItemName(current) || '—';

    return (
      <div key={slot.key} className={styles.slot}>
        <div className={styles.slotHeader}>
          {SLOT_ICONS[slot.key] ? (
            <span aria-hidden="true" className={styles.slotIcon}>
              {SLOT_ICONS[slot.key]}
            </span>
          ) : null}
          <span className={styles.slotLabel}>{slot.label}</span>
        </div>
        <div
          className={current ? styles.slotItem : styles.slotItemEmpty}
          data-testid={`${slot.key}-item-display`}
        >
          {displayName}
        </div>
        <div className={styles.slotControls}>
          <Form.Select
            aria-label={`${slot.label} slot selection`}
            value={selectedValue}
            disabled={disabled}
            className={styles.slotSelect}
            size="sm"
            onChange={(event) => handleAssign(slot.key, event.target.value)}
          >
            <option value="">Unequipped</option>
            {optionsForSlot.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
                {opt.description ? ` (${opt.description})` : ''}
              </option>
            ))}
          </Form.Select>
          <Button
            variant="outline-light"
            size="sm"
            disabled={disabled || !current}
            onClick={() => handleAssign(slot.key, '')}
            className={styles.clearButton}
          >
            Clear Slot
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.rackWrapper}>
      <p className="text-muted small mb-3">
        {hasOptions
          ? "Assign owned items to equipment slots. Selecting an option will update the character's loadout immediately."
          : "You do not have any owned inventory to assign yet. Equip gear from the inventory tabs to populate this rack."}
      </p>
      <div className={styles.rackLayout}>
        <div className={styles.columns}>
          <div className={styles.leftColumn}>
            {SLOT_LAYOUT.leftColumn.map((slotKey) =>
              renderSlot(slotLookup.get(slotKey))
            )}
          </div>
          <div className={styles.rightColumn}>
            {SLOT_LAYOUT.rightColumn.map((slotKey) =>
              renderSlot(slotLookup.get(slotKey))
            )}
          </div>
        </div>
        <div className={styles.bottomRow}>
          {SLOT_LAYOUT.bottomRow.map((slotKey) =>
            renderSlot(slotLookup.get(slotKey))
          )}
        </div>
      </div>
    </div>
  );
}
