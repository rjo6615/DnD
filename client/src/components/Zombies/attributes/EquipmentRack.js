import React, { useMemo, useCallback } from 'react';
import { Form, Button } from 'react-bootstrap';
import { EQUIPMENT_SLOT_LAYOUT } from './equipmentSlots';

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

const rackStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
};

const slotStyles = {
  border: '1px solid rgba(108, 117, 125, 0.5)',
  borderRadius: '0.75rem',
  padding: '0.75rem',
  minHeight: '180px',
  background: 'linear-gradient(135deg, rgba(33,37,41,0.85), rgba(73,80,87,0.65))',
  color: 'var(--bs-light, #f8f9fa)',
  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const labelStyles = {
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 700,
  opacity: 0.85,
  marginBottom: '0.5rem',
};

const itemStyles = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  borderRadius: '0.5rem',
  background: 'rgba(255, 255, 255, 0.05)',
  marginBottom: '0.75rem',
  padding: '0.5rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  minHeight: '3rem',
  wordBreak: 'break-word',
};

const controlsStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
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
      <div key={slot.key} style={slotStyles}>
        <div style={labelStyles}>{slot.label}</div>
        <div style={itemStyles}>{displayName}</div>
        <div style={controlsStyles}>
          <Form.Select
            aria-label={`${slot.label} slot selection`}
            value={selectedValue}
            disabled={disabled}
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
          >
            Clear Slot
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="text-muted small mb-3">
        {hasOptions
          ? "Assign owned items to equipment slots. Selecting an option will update the character's loadout immediately."
          : "You do not have any owned inventory to assign yet. Equip gear from the inventory tabs to populate this rack."}
      </p>
      <div style={rackStyles}>
        {FLAT_SLOTS.map((slot) => renderSlot(slot))}
      </div>
    </div>
  );
}
