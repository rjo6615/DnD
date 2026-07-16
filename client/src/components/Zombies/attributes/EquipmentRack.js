import React, { useMemo, useCallback, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Search, Shield, Sparkles, Sword, X, CheckCircle2 } from 'lucide-react';
import { EQUIPMENT_SLOT_LAYOUT } from './equipmentSlots';
import ItemIcon from '../../common/ItemIcon';
import styles from './EquipmentRack.module.scss';

const FLAT_SLOTS = EQUIPMENT_SLOT_LAYOUT.flat();
const DEFAULT_ALLOWED_SOURCES = ['weapon', 'armor', 'item', 'accessory'];
const SOURCE_DESCRIPTIONS = { weapon: 'Weapon', armor: 'Armor', item: 'Item', accessory: 'Accessory' };
const DESCRIPTOR_KEYS = ['category', 'categories', 'type', 'types', 'slot', 'slots', 'tags', 'subtype', 'subType', 'equipmentSlot', 'equipmentSlots', 'targetSlot', 'targetSlots'];
const SLOT_METADATA_KEYS = ['slot', 'equipmentSlot', 'slots', 'equipmentSlots', 'targetSlot', 'targetSlots'];
const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const RARITIES = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact'];
const PAPER_DOLL_SLOTS = [
  'ranged', 'head', 'eyes',
  'mainHand', 'shoulders', 'offHand',
  'ringLeft', 'neck', 'ringRight',
  'arms', 'chest', 'wrists',
  'hands', 'waist', 'back',
  'legs', 'feet', null,
];

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
const matchesAllowedValues = (descriptors, allowedValues = []) => {
  if (!allowedValues?.length || !descriptors?.length) return true;
  return allowedValues.some((allowed) => descriptors.some((descriptor) => descriptor.includes(allowed.toLowerCase())));
};
const getMetadataFilterEntries = (filters) => {
  if (!filters || typeof filters !== 'object') return [];
  const entries = new Set();
  SLOT_METADATA_KEYS.forEach((key) => filters[key] && normalizeSlotEntries(filters[key]).forEach((entry) => entries.add(entry)));
  return Array.from(entries);
};
const getItemSlotMetadata = (item) => {
  const slots = new Set();
  if (!item || typeof item !== 'object') return slots;
  SLOT_METADATA_KEYS.forEach((key) => normalizeSlotEntries(item[key]).forEach((entry) => slots.add(entry)));
  return slots;
};
const matchesMetadataFilters = (item, filters) => {
  const metadataFilters = getMetadataFilterEntries(filters);
  if (!metadataFilters.length) return true;
  const itemSlots = getItemSlotMetadata(item);
  if (itemSlots.size === 0) return true;
  return metadataFilters.some((entry) => itemSlots.has(entry));
};
const slotMatchesItemMetadata = (slot, itemSlots) => {
  if (!slot || !itemSlots?.size) return true;
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
  const allowedSources = slot?.allowedSources?.length ? slot.allowedSources : DEFAULT_ALLOWED_SOURCES;
  return allowedSources.flatMap((source) => (optionsBySource[source] || []).filter((option) => slotAllowsOption(slot, option)));
};
const getItemName = (item) => !item ? '' : typeof item === 'string' ? item : item.displayName || item.name || item.itemName || item.accessoryName || item.armorName || item.title || '';
const getItemSource = (item) => item && typeof item === 'object' ? item.source || item.__source || item.reference?.source : undefined;
const normalizeRarity = (item) => String(item?.rarity || item?.quality || 'common').toLowerCase();
const getDescription = (item) => item?.description || item?.notes || item?.detail || item?.flavor || 'No description recorded for this piece of gear.';
const getCharacterPart = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getCharacterPart).filter(Boolean).join(', ');
  if (typeof value === 'object') return value.name || value.Name || value.displayName || value.title || '';
  return String(value);
};
const getStatLines = (item) => {
  if (!item) return [];
  const lines = [];
  if (item.acBonus !== undefined && item.acBonus !== '') lines.push(`+${item.acBonus} AC`);
  if (item.attackBonus) lines.push(`+${item.attackBonus} Attack`);
  if (item.damage) lines.push(item.damage);
  Object.entries(item.statBonuses || {}).forEach(([key, value]) => Number(value) ? lines.push(`${Number(value) > 0 ? '+' : ''}${value} ${STAT_LABELS[key] || key.toUpperCase()}`) : null);
  Object.entries(item.statOverrides || {}).forEach(([key, value]) => value ? lines.push(`${STAT_LABELS[key] || key.toUpperCase()} set to ${value}`) : null);
  return lines;
};
const optionMatchesItem = (option, current) => {
  const itemName = getItemName(current);
  if (!itemName) return false;
  const currentSource = getItemSource(current);
  const candidateName = getItemName(option.item);
  return currentSource ? option.source === currentSource && candidateName === itemName : candidateName === itemName;
};

export default function EquipmentRack({ equipment = {}, inventory = {}, onEquipmentChange, onSlotChange, disabled = false, character = {} }) {
  const [selectedSlotKey, setSelectedSlotKey] = useState('chest');
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const { weapons = [], armor = [], items = [], accessories = [] } = inventory || {};
  const slotLookup = useMemo(() => new Map(FLAT_SLOTS.map((slot) => [slot.key, slot])), []);
  const selectedSlot = slotLookup.get(selectedSlotKey) || FLAT_SLOTS[0];
  const equippedItems = useMemo(() => Object.values(equipment || {}).filter(Boolean), [equipment]);
  const inventoryOptions = useMemo(() => {
    const all = []; const bySource = {};
    const addOptions = (itemsList = [], source) => itemsList.forEach((item, index) => {
      const name = getItemName(item); if (!name) return;
      const option = { value: `${source}-${index}-${name}`, label: name, item, source, description: SOURCE_DESCRIPTIONS[source] || 'Item' };
      all.push(option); (bySource[source] ||= []).push(option);
    });
    addOptions(weapons, 'weapon'); addOptions(armor, 'armor'); addOptions(items, 'item'); addOptions(accessories, 'accessory');
    return { all, bySource };
  }, [accessories, armor, items, weapons]);
  const optionMap = useMemo(() => new Map(inventoryOptions.all.map((opt) => [opt.value, opt])), [inventoryOptions]);
  const slotOptionsMap = useMemo(() => new Map(FLAT_SLOTS.map((slot) => [slot.key, buildSlotOptions(slot, inventoryOptions.bySource)])), [inventoryOptions]);
  const selectedOptions = slotOptionsMap.get(selectedSlot.key) || [];
  const currentItem = equipment?.[selectedSlot.key];
  const compatibleOptions = selectedOptions.filter((opt) => {
    const haystack = `${opt.label} ${opt.description} ${getStatLines(opt.item).join(' ')}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesRarity = rarityFilter === 'all' || normalizeRarity(opt.item) === rarityFilter;
    return matchesSearch && matchesRarity;
  });
  const summary = useMemo(() => {
    const stats = { ac: 0, attack: 0, weight: 0, passive: 0 };
    equippedItems.forEach((item) => {
      stats.ac += Number(item.acBonus) || 0; stats.attack += Number(item.attackBonus) || 0; stats.weight += Number(item.weight) || 0;
      stats.passive += Object.values(item.statBonuses || {}).filter(Boolean).length + Object.values(item.statOverrides || {}).filter(Boolean).length;
    });
    return stats;
  }, [equippedItems]);
  const handleAssign = useCallback((slotKey, optionValue) => {
    if (typeof onEquipmentChange !== 'function' && typeof onSlotChange !== 'function') return;
    const option = optionValue ? optionMap.get(optionValue) : null;
    const nextItem = option ? { ...(typeof option.item === 'object' ? option.item : { name: getItemName(option.item) }), source: option.source, __source: option.source } : null;
    const nextEquipment = { ...equipment, [slotKey]: nextItem };
    onSlotChange?.(slotKey, nextItem); onEquipmentChange?.(nextEquipment);
  }, [equipment, onEquipmentChange, onSlotChange, optionMap]);
  const renderSlot = (slot) => {
    const item = equipment?.[slot.key]; const rarity = normalizeRarity(item); const lines = getStatLines(item).slice(0, 2);
    return <button key={slot.key} type="button" className={`${styles.socket} ${item ? styles.equippedSocket : styles.emptySocket} ${styles[`slot_${slot.key}`] || ''} ${styles[`rarity_${rarity}`] || ''} ${selectedSlot.key === slot.key ? styles.selected : ''}`} onClick={() => setSelectedSlotKey(slot.key)} disabled={disabled} aria-label={`${slot.label} equipment slot${item ? ` equipped with ${getItemName(item)}` : ', empty'}`}>
      <span className={styles.socketLabel}>{slot.label}</span><span className={styles.socketIcon}><ItemIcon item={item} equipmentSlot={slot.key} size={40} title={slot.label} /></span>
      <span className={styles.socketState}>{item ? 'Equipped' : 'Open'}</span><span className={styles.socketName}>{item ? getItemName(item) : 'Empty Slot'}</span><span className={styles.socketMeta}>{item ? (lines[0] || SOURCE_DESCRIPTIONS[getItemSource(item)] || 'Equipped') : 'Click to equip'}</span>
    </button>;
  };
  const detailItem = currentItem;
  return <div className={styles.rackWrapper}>
    <div className={styles.bonusSummary} aria-label="Active equipment bonuses"><div><strong>{summary.ac >= 0 ? '+' : ''}{summary.ac}</strong><span>Armor Class</span></div><div><strong>{summary.attack >= 0 ? '+' : ''}{summary.attack}</strong><span>Attack Bonus</span></div><div><strong>{summary.passive}</strong><span>Passive Effects</span></div><div><strong>{summary.weight}</strong><span>Weight</span></div></div>
    <div className={styles.equipmentShell}>
      <section className={styles.paperDoll} aria-label="Character equipment rack">
        <div className={styles.characterPreview}><div className={styles.characterAura}><Shield size={54}/></div><h3>{character.name || 'Adventurer'}</h3><p>{[getCharacterPart(character.race), getCharacterPart(character.className || character.occupation?.[0]?.Name), character.level && `Level ${character.level}`].filter(Boolean).join(' • ') || 'Equipped hero'}</p><span><Sword size={15}/> {equippedItems.length} slots active</span></div>
        {PAPER_DOLL_SLOTS.map((key, index) => key ? renderSlot(slotLookup.get(key)) : <span key={`spacer-${index}`} className={styles.slotSpacer} aria-hidden="true" />)}
      </section>
      <aside className={styles.detailPanel} aria-live="polite"><div className={styles.panelHeader}><span>{selectedSlot.label}</span><strong>{detailItem ? getItemName(detailItem) : 'Empty Slot'}</strong></div>{detailItem ? <><div className={`${styles.itemHero} ${styles[`rarity_${normalizeRarity(detailItem)}`] || ''}`}><ItemIcon item={detailItem} equipmentSlot={selectedSlot.key} size={72}/><span>{normalizeRarity(detailItem)}</span></div><p>{getDescription(detailItem)}</p><div className={styles.statList}>{getStatLines(detailItem).map((line) => <span key={line}>{line}</span>)}</div><dl className={styles.itemFacts}><dt>Type</dt><dd>{SOURCE_DESCRIPTIONS[getItemSource(detailItem)] || 'Gear'}</dd><dt>Weight</dt><dd>{detailItem.weight || '—'}</dd><dt>Value</dt><dd>{detailItem.cost || detailItem.value || '—'}</dd></dl><Button variant="outline-light" className={styles.unequipButton} onClick={() => handleAssign(selectedSlot.key, '')} disabled={disabled}><X size={16}/> Unequip</Button></> : <div className={styles.emptyDetail}><Sparkles size={42}/><p>Select compatible owned gear below to fill this socket.</p></div>}
        <div className={styles.picker}><div className={styles.pickerTools}><label><Search size={15}/><Form.Control size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search compatible gear" aria-label="Search compatible gear" /></label><Form.Select size="sm" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} aria-label="Filter by rarity">{RARITIES.map((rarity) => <option key={rarity} value={rarity}>{rarity === 'all' ? 'All rarities' : rarity}</option>)}</Form.Select></div><div className={styles.itemList}>{compatibleOptions.length ? compatibleOptions.map((opt) => { const equipped = optionMatchesItem(opt, currentItem); const rarity = normalizeRarity(opt.item); return <button key={opt.value} type="button" className={`${styles.itemCard} ${styles[`rarity_${rarity}`] || ''}`} onClick={() => handleAssign(selectedSlot.key, opt.value)} disabled={disabled} title={`${opt.label} - ${getDescription(opt.item)}`}><ItemIcon item={opt.item} equipmentSlot={selectedSlot.key} size={34}/><span><strong>{opt.label}</strong><small>{rarity} • {getStatLines(opt.item).slice(0, 2).join(' • ') || opt.description}</small></span>{equipped ? <CheckCircle2 size={18}/> : <em>Equip</em>}</button>; }) : <p className={styles.noItems}>No owned compatible equipment found for this slot.</p>}</div></div>
      </aside>
    </div>
  </div>;
}
