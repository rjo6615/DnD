import React, { useMemo, useCallback, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { EQUIPMENT_SLOT_LAYOUT } from './equipmentSlots';
import ItemIcon from '../../common/ItemIcon';
import styles from './EquipmentRack.module.scss';

const FLAT_SLOTS = EQUIPMENT_SLOT_LAYOUT.flat();

const DEFAULT_ALLOWED_SOURCES = ['weapon', 'armor', 'item', 'accessory'];

const SOURCE_DESCRIPTIONS = {
  weapon: 'Weapon',
  armor: 'Armor',
  item: 'Item',
  accessory: 'Accessory',
};

const DESCRIPTOR_KEYS = [
  'category', 'categories', 'type', 'types', 'slot', 'slots', 'tags', 'subtype',
  'subType', 'equipmentSlot', 'equipmentSlots', 'targetSlot', 'targetSlots',
];

const SLOT_METADATA_KEYS = ['slot', 'equipmentSlot', 'slots', 'equipmentSlots', 'targetSlot', 'targetSlots'];

const RARITY_ORDER = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact'];

const ABILITY_LABELS = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

const toLowercaseStrings = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string' && entry.trim().length).map((entry) => entry.toLowerCase());
  if (typeof value === 'string') return value.trim().length ? [value.toLowerCase()] : [];
  return [];
};

const normalizeSlotEntries = (value) => {
  const normalized = new Set();
  toLowercaseStrings(value).forEach((entry) => {
    normalized.add(entry);
    const compact = entry.replace(/[\s_-]+/g, '');
    if (compact) normalized.add(compact);
  });
  return Array.from(normalized);
};

const getItemDescriptors = (item) => {
  if (!item || typeof item !== 'object') return [];
  const descriptors = new Set();
  DESCRIPTOR_KEYS.forEach((key) => toLowercaseStrings(item[key]).forEach((descriptor) => descriptors.add(descriptor)));
  return Array.from(descriptors);
};

const getItemSlotMetadata = (item) => {
  if (!item || typeof item !== 'object') return new Set();
  const slots = new Set();
  SLOT_METADATA_KEYS.forEach((key) => normalizeSlotEntries(item[key]).forEach((entry) => slots.add(entry)));
  return slots;
};

const matchesAllowedValues = (descriptors, allowedValues = []) => {
  if (!allowedValues?.length) return true;
  if (!descriptors?.length) return true;
  return allowedValues.some((allowed) => {
    const normalized = allowed.toLowerCase();
    return descriptors.some((descriptor) => descriptor.includes(normalized));
  });
};

const getMetadataFilterEntries = (filters) => {
  if (!filters || typeof filters !== 'object') return [];
  const entries = new Set();
  SLOT_METADATA_KEYS.forEach((key) => {
    if (filters[key]) normalizeSlotEntries(filters[key]).forEach((entry) => entries.add(entry));
  });
  return Array.from(entries);
};

const matchesMetadataFilters = (item, filters) => {
  const metadataFilters = getMetadataFilterEntries(filters);
  if (!metadataFilters.length) return true;
  const itemSlots = getItemSlotMetadata(item);
  if (itemSlots.size === 0) return true;
  return metadataFilters.some((entry) => itemSlots.has(entry));
};

const slotMatchesItemMetadata = (slot, itemSlots) => {
  if (!slot || !itemSlots || itemSlots.size === 0) return true;
  return normalizeSlotEntries(slot.key || slot).some((entry) => itemSlots.has(entry));
};

const slotAllowsOption = (slot, option) => {
  if (!slot || !option) return false;
  const allowedSources = slot.allowedSources?.length ? slot.allowedSources : DEFAULT_ALLOWED_SOURCES;
  if (!allowedSources.includes(option.source)) return false;
  const sourceFilters = slot.filters?.[option.source];
  if (!sourceFilters) {
    if (option.source === 'armor' || option.source === 'accessory') {
      const itemSlots = getItemSlotMetadata(option.item);
      if (itemSlots.size > 0 && !slotMatchesItemMetadata(slot, itemSlots)) return false;
    }
    return true;
  }
  const descriptors = getItemDescriptors(option.item);
  if (sourceFilters.categories && !matchesAllowedValues(descriptors, sourceFilters.categories)) return false;
  if (sourceFilters.types && !matchesAllowedValues(descriptors, sourceFilters.types)) return false;
  return matchesMetadataFilters(option.item, sourceFilters);
};

const buildSlotOptions = (slot, optionsBySource) => {
  if (!slot) return [];
  const allowedSources = slot.allowedSources?.length ? slot.allowedSources : DEFAULT_ALLOWED_SOURCES;
  const options = [];
  allowedSources.forEach((source) => (optionsBySource[source] || []).forEach((option) => {
    if (slotAllowsOption(slot, option)) options.push(option);
  }));
  return options;
};

const getItemName = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item !== 'object') return String(item);
  return item.displayName || item.name || item.itemName || item.accessoryName || item.armorName || item.title || '';
};


const formatDisplayValue = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatDisplayValue(entry))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    if (value.name || value.label || value.title) {
      return String(value.name || value.label || value.title);
    }
    return Object.entries(value)
      .map(([key, entry]) => {
        const formatted = formatDisplayValue(entry);
        return formatted ? `${key}: ${formatted}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }
  return String(value);
};

const getItemSource = (item) => item && typeof item === 'object' ? (item.source || item.__source || item.reference?.source) : undefined;
const getItemRarity = (item) => String(item?.rarity || item?.quality || item?.tier || 'common').toLowerCase();
const getItemDescription = (item) => formatDisplayValue(item?.description || item?.desc || item?.details || item?.notes) || 'No lore entry has been recorded for this piece yet.';

const getStatLines = (item) => {
  if (!item || typeof item !== 'object') return [];
  const lines = [];
  const add = (label, value, prefix = '+') => {
    const number = Number(value);
    if (Number.isFinite(number) && number !== 0) lines.push(`${number > 0 ? prefix : ''}${number} ${label}`);
  };
  add('AC', item.acBonus || item.armorClassBonus || item.bonusAc || item.bonusAC);
  add('Attack', item.attackBonus || item.toHitBonus);
  add('Damage', item.damageBonus || item.bonusDamage);
  add('Speed', item.speedBonus || item.movementBonus, '+');
  Object.entries(item.statBonuses || item.abilityBonuses || {}).forEach(([key, value]) => add(ABILITY_LABELS[key] || key, value));
  Object.entries(item.statOverrides || {}).forEach(([key, value]) => lines.push(`${ABILITY_LABELS[key] || key} set to ${value}`));
  const damage = formatDisplayValue(item.damage);
  if (damage) lines.push(`${damage} damage`);
  const properties = Array.isArray(item.properties)
    ? item.properties.slice(0, 2)
    : item.properties;
  const formattedProperties = formatDisplayValue(properties);
  if (formattedProperties) lines.push(formattedProperties);
  return lines.slice(0, 4);
};

const getMetrics = (equipment) => Object.values(equipment || {}).filter(Boolean).reduce((acc, item) => {
  acc.ac += Number(item.acBonus || item.armorClassBonus || item.bonusAc || item.bonusAC || 0);
  acc.attack += Number(item.attackBonus || item.toHitBonus || 0);
  acc.damage += Number(item.damageBonus || item.bonusDamage || 0);
  acc.speed += Number(item.speedBonus || item.movementBonus || 0);
  acc.passives += getStatLines(item).length;
  return acc;
}, { ac: 0, attack: 0, damage: 0, speed: 0, passives: 0 });

const materializeOptionItem = (option) => {
  if (!option) return null;
  const base = option.item && typeof option.item === 'object' ? { ...option.item } : { name: getItemName(option.item) };
  return { ...base, source: option.source, __source: option.source };
};

export default function EquipmentRack({ equipment = {}, inventory = {}, onEquipmentChange, onSlotChange, disabled = false }) {
  const { weapons = [], armor = [], items = [], accessories = [] } = inventory || {};
  const [selectedSlotKey, setSelectedSlotKey] = useState('chest');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [previewOption, setPreviewOption] = useState(null);

  const slotLookup = useMemo(() => new Map(FLAT_SLOTS.map((slot) => [slot.key, slot])), []);
  const selectedSlot = slotLookup.get(selectedSlotKey) || FLAT_SLOTS[0];

  const inventoryOptions = useMemo(() => {
    const options = [];
    const bySource = {};
    const addOptions = (itemsList = [], source) => {
      if (!itemsList?.length) return;
      bySource[source] = bySource[source] || [];
      itemsList.forEach((item, index) => {
        const name = getItemName(item);
        if (!name) return;
        const option = { value: `${source}-${index}-${name}`, label: name, item, source, description: SOURCE_DESCRIPTIONS[source] || 'Item' };
        options.push(option); bySource[source].push(option);
      });
    };
    addOptions(weapons, 'weapon'); addOptions(armor, 'armor'); addOptions(items, 'item'); addOptions(accessories, 'accessory');
    return { all: options, bySource };
  }, [accessories, armor, items, weapons]);

  const slotOptionsMap = useMemo(() => new Map(FLAT_SLOTS.map((slot) => [slot.key, buildSlotOptions(slot, inventoryOptions.bySource)])), [inventoryOptions]);
  const hasOptions = inventoryOptions.all.length > 0;

  const handleAssign = useCallback((slotKey, option) => {
    if (typeof onEquipmentChange !== 'function' && typeof onSlotChange !== 'function') return;
    const nextItem = option ? materializeOptionItem(option) : null;
    const nextEquipment = { ...equipment, [slotKey]: nextItem };
    onSlotChange?.(slotKey, nextItem);
    onEquipmentChange?.(nextEquipment);
    setPreviewOption(null);
  }, [equipment, onEquipmentChange, onSlotChange]);

  const openPicker = (slotKey) => { setSelectedSlotKey(slotKey); setPickerOpen(true); setQuery(''); setPreviewOption(null); };
  const currentItem = equipment?.[selectedSlot.key];
  const inspectedItem = previewOption ? materializeOptionItem(previewOption) : currentItem;
  const currentMetrics = getMetrics(equipment);
  const previewMetrics = getMetrics({ ...equipment, [selectedSlot.key]: inspectedItem || null });

  const filteredOptions = (slotOptionsMap.get(selectedSlot.key) || [])
    .filter((opt) => !query || opt.label.toLowerCase().includes(query.toLowerCase()))
    .filter((opt) => rarityFilter === 'all' || getItemRarity(opt.item) === rarityFilter)
    .sort((a, b) => getItemRarity(b.item).localeCompare(getItemRarity(a.item)) || a.label.localeCompare(b.label));

  const renderSlotCard = (slot) => {
    const item = equipment?.[slot.key];
    const statLines = getStatLines(item);
    const rarity = item ? getItemRarity(item) : 'empty';
    return (
      <article key={slot.key} className={`${styles.slotCard} ${styles[`slot_${slot.key}`] || ''} ${styles[`rarity_${rarity}`] || ''} ${selectedSlotKey === slot.key ? styles.selected : ''}`}>
        <button type="button" className={styles.slotButton} onClick={() => openPicker(slot.key)} aria-label={`${slot.label}: ${item ? `change ${getItemName(item)}` : 'choose equipment'}`} disabled={disabled}>
          <span className={styles.slotHeader}><ItemIcon equipmentSlot={slot.key} size={30} className={styles.slotIcon} title="" /><span>{slot.label}</span></span>
          <span className={styles.itemArt}><ItemIcon equipmentSlot={slot.key} item={item} size={46} title={getItemName(item) || slot.label} /></span>
          <span className={styles.itemName}>{getItemName(item) || 'Empty Slot'}</span>
          <span className={styles.rarityBadge}>{item ? rarity : 'Available'}</span>
          <span className={styles.statLine}>{statLines[0] || (item ? 'No tracked bonuses' : 'Choose equipment')}</span>
        </button>
        <div className={styles.quickActions}>
          <Button size="sm" className={styles.miniButton} onClick={() => openPicker(slot.key)} disabled={disabled}>{item ? 'Change' : 'Equip'}</Button>
          <Button size="sm" className={styles.iconButton} title="Unequip" aria-label={`Unequip ${slot.label}`} onClick={() => handleAssign(slot.key, null)} disabled={disabled || !item}>✕</Button>
        </div>
      </article>
    );
  };

  return (
    <div className={styles.equipmentShell}>
      <section className={styles.bonusSummary} aria-label="Active equipment bonuses">
        {[['Armor Class', currentMetrics.ac], ['Attack', currentMetrics.attack], ['Damage', currentMetrics.damage], ['Movement', currentMetrics.speed], ['Passive Lines', currentMetrics.passives]].map(([label, value]) => (
          <div className={styles.bonusPill} key={label}><span>{label}</span><strong>{value > 0 ? `+${value}` : value}</strong></div>
        ))}
      </section>
      <div className={styles.rackLayout}>
        <div className={styles.slotGrid}>
          <div className={styles.characterPreview}>
            <div className={styles.previewSigil}>✦</div>
            <h3>Loadout</h3>
            <p>{hasOptions ? 'Click any socket to compare and equip owned gear.' : 'Owned gear will appear here when inventory is available.'}</p>
          </div>
          {FLAT_SLOTS.map((slot) => renderSlotCard(slot))}
        </div>
        <div className={styles.leftColumn}>{SLOT_LAYOUT.leftColumn.map((slotKey) => renderSlotCard(slotLookup.get(slotKey)))}</div>
        <div className={styles.rightColumn}>{SLOT_LAYOUT.rightColumn.map((slotKey) => renderSlotCard(slotLookup.get(slotKey)))}</div>
        <div className={styles.bottomRow}>{SLOT_LAYOUT.bottomRow.map((slotKey) => renderSlotCard(slotLookup.get(slotKey)))}</div>
      </div>
      <aside className={styles.detailsPanel} aria-live="polite">
        <div className={styles.detailsHero}><ItemIcon equipmentSlot={selectedSlot.key} item={inspectedItem} size={58} /><div><span className={styles.eyebrow}>{selectedSlot.label}</span><h3>{getItemName(inspectedItem) || 'Empty Slot'}</h3><span className={styles.rarityBadge}>{inspectedItem ? getItemRarity(inspectedItem) : 'No item equipped'}</span></div></div>
        <p>{inspectedItem ? getItemDescription(inspectedItem) : 'Pick owned equipment for this slot to see details, bonuses, and upgrade previews.'}</p>
        <div className={styles.statChips}>{(getStatLines(inspectedItem).length ? getStatLines(inspectedItem) : ['No tracked bonuses']).map((line) => <span key={line}>{line}</span>)}</div>
        <div className={styles.compareGrid}>{Object.keys(currentMetrics).map((key) => { const diff = previewMetrics[key] - currentMetrics[key]; return <div key={key}><span>{key}</span><strong>{currentMetrics[key]} → {previewMetrics[key]}</strong><em className={diff >= 0 ? styles.positive : styles.negative}>{diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff}`}</em></div>; })}</div>
      </aside>
      {pickerOpen && <section className={styles.picker} role="dialog" aria-modal="false" aria-label={`${selectedSlot.label} equipment picker`}>
        <div className={styles.pickerHeader}><div><span className={styles.eyebrow}>Owned equipment</span><h3>{selectedSlot.label}</h3></div><Button className={styles.iconButton} onClick={() => setPickerOpen(false)} aria-label="Close equipment picker">✕</Button></div>
        <div className={styles.pickerControls}><Form.Control aria-label="Search owned equipment" placeholder="Search gear" value={query} onChange={(event) => setQuery(event.target.value)} /><Form.Select aria-label="Filter by rarity" value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>{RARITY_ORDER.map((rarity) => <option key={rarity} value={rarity}>{rarity === 'all' ? 'All rarities' : rarity}</option>)}</Form.Select></div>
        <div className={styles.itemGrid}>{filteredOptions.map((opt) => { const equipped = getItemName(currentItem) === opt.label && getItemSource(currentItem) === opt.source; return <article key={opt.value} className={`${styles.itemCard} ${styles[`rarity_${getItemRarity(opt.item)}`] || ''}`} onMouseEnter={() => setPreviewOption(opt)}><button type="button" onClick={() => setPreviewOption(opt)}><ItemIcon equipmentSlot={selectedSlot.key} item={opt.item} size={34} /><span><strong>{opt.label}</strong><small>{getItemRarity(opt.item)} · {opt.description}</small></span></button><p>{getStatLines(opt.item).join(' · ') || 'No tracked bonuses'}</p><Button size="sm" className={styles.miniButton} onClick={() => { handleAssign(selectedSlot.key, opt); setPickerOpen(false); }} disabled={disabled}>{equipped ? 'Equipped' : 'Equip'}</Button></article>; })}{!filteredOptions.length && <div className={styles.emptyState}>No owned equipment matches this slot and filter.</div>}</div>
      </section>}
    </div>
  );
}
