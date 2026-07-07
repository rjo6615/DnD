import React from 'react';
import {
  Archive, Axe, Backpack, Badge, Beef, BookOpen, Box, Briefcase, ChevronUp,
  CircleDot, Coins, Crosshair, Diamond, Drum, Eye, FlaskConical, Footprints,
  Gem, Glasses, Hammer, Hand, KeyRound, Landmark, Map, Milk, Package,
  Pickaxe, ScrollText, Shield, Shirt, Sparkles, Sword, Swords, Utensils,
  Wand2, Wallet, Wrench,
} from 'lucide-react';

const normalize = (value) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, ' ')
    : '';

const splitTerms = (value) => {
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean);
  const normalized = normalize(value);
  return normalized ? [normalized] : [];
};

const makeSvg = (paths) => (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {paths.map((d) => <path key={d} d={d} />)}
  </svg>
);

const CUSTOM_ICONS = {
  bow: makeSvg(['M17 3c-4 3.6-4 14.4 0 18', 'M17 3c2.5 4.7 2.5 13.3 0 18', 'M6 12h11', 'm10 8-4 4 4 4']),
  crossbow: makeSvg(['M4 7c4 3 12 3 16 0', 'M4 7c3-3 13-3 16 0', 'M12 6v13', 'M8 19h8', 'M5 12h14', 'm17 10 2 2-2 2']),
  dagger: makeSvg(['m14 3 7 7-8.5 5.5L8.5 11.5 14 3Z', 'm4 20 5-5', 'm7 13 4 4']),
  staff: makeSvg(['M12 22V8', 'M12 2 9 6l3 4 3-4-3-4Z', 'M8 12h8']),
  helmet: makeSvg(['M4 13a8 8 0 0 1 16 0v3H4v-3Z', 'M4 16v3h5v-3', 'M15 16v3h5v-3', 'M12 5v11']),
  ring: makeSvg(['M8 10 12 4l4 6', 'M7 14a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z', 'M9 10h6']),
  amulet: makeSvg(['M6 3c0 5 12 5 12 0', 'M12 8v4', 'm9 14 3-3 3 3-3 6-3-6']),
  cloak: makeSvg(['M8 4h8l3 17-7-3-7 3L8 4Z', 'M9 4c1.5 2 4.5 2 6 0']),
  boots: makeSvg(['M7 3v12l-3 3v3h8v-3l-2-3V3', 'M15 3v11l-2 3v3h7v-3l-2-3V3']),
  belt: makeSvg(['M3 9h18v6H3z', 'M10 8h4v8h-4z', 'M14 12h3']),
  torch: makeSvg(['M12 8c-2-2 1-4 0-6 4 2 5 5 2 8', 'M10 9h6l-2 12h-2L10 9Z', 'M9 13h6']),
};

const ICON_RULES = [
  { terms: ['crossbow'], icon: CUSTOM_ICONS.crossbow }, { terms: ['longbow', 'shortbow', 'bow'], icon: CUSTOM_ICONS.bow },
  { terms: ['dagger', 'knife', 'dart'], icon: CUSTOM_ICONS.dagger }, { terms: ['greatsword', 'longsword', 'shortsword', 'scimitar', 'rapier', 'sword'], icon: Sword },
  { terms: ['battleaxe', 'handaxe', 'greataxe', 'axe'], icon: Axe }, { terms: ['warhammer', 'maul', 'hammer', 'mace', 'club'], icon: Hammer },
  { terms: ['spear', 'javelin', 'lance', 'pike', 'halberd', 'glaive', 'quarterstaff', 'staff'], icon: CUSTOM_ICONS.staff },
  { terms: ['shield', 'buckler'], icon: Shield }, { terms: ['ammunition', 'arrow', 'bolt', 'sling bullet', 'ammo'], icon: Crosshair },
  { terms: ['potion', 'flask', 'vial', 'elixir', 'poison', 'acid', 'oil'], icon: FlaskConical }, { terms: ['scroll', 'parchment'], icon: ScrollText },
  { terms: ['spellbook', 'book', 'tome', 'manual', 'grimoire'], icon: BookOpen }, { terms: ['wand'], icon: Wand2 },
  { terms: ['rod', 'focus', 'arcane focus', 'druidic focus', 'holy symbol', 'orb', 'crystal'], icon: Sparkles },
  { terms: ['helmet', 'helm', 'hat', 'circlet', 'crown', 'headband', 'head'], icon: CUSTOM_ICONS.helmet },
  { terms: ['armor', 'breastplate', 'plate', 'mail', 'chain', 'leather', 'robe', 'chest'], icon: Shirt },
  { terms: ['glove', 'gauntlet', 'hand'], icon: Hand }, { terms: ['boot', 'shoe', 'feet', 'foot'], icon: CUSTOM_ICONS.boots },
  { terms: ['belt', 'sash', 'girdle', 'waist'], icon: CUSTOM_ICONS.belt }, { terms: ['bracer', 'bracelet', 'wrist', 'vambrace'], icon: Badge },
  { terms: ['ring', 'band', 'signet'], icon: CUSTOM_ICONS.ring }, { terms: ['amulet', 'necklace', 'pendant', 'torc', 'neck'], icon: CUSTOM_ICONS.amulet },
  { terms: ['cloak', 'cape', 'mantle', 'back'], icon: CUSTOM_ICONS.cloak }, { terms: ['goggles', 'glasses', 'lens', 'eye', 'visor'], icon: Glasses },
  { terms: ['tool', 'artisan', 'kit', 'lockpick', 'thieves', 'supplies'], icon: Wrench }, { terms: ['instrument', 'lute', 'flute', 'drum', 'horn', 'music'], icon: Drum },
  { terms: ['gaming set', 'dice', 'cards', 'game'], icon: CircleDot }, { terms: ['backpack', 'pack', 'adventuring gear'], icon: Backpack },
  { terms: ['torch', 'lantern', 'candle'], icon: CUSTOM_ICONS.torch }, { terms: ['map'], icon: Map }, { terms: ['key'], icon: KeyRound },
  { terms: ['chest', 'treasure chest', 'container', 'box', 'case', 'pouch', 'bag'], icon: Box }, { terms: ['coin', 'currency', 'gold', 'silver', 'copper', 'platinum'], icon: Coins },
  { terms: ['gem', 'jewel', 'diamond', 'treasure'], icon: Gem }, { terms: ['food', 'ration', 'meat', 'bread'], icon: Beef },
  { terms: ['material', 'crafting', 'ore', 'ingot'], icon: Pickaxe }, { terms: ['quest', 'relic', 'artifact'], icon: Diamond },
  { terms: ['mount', 'vehicle', 'saddle', 'tack'], icon: Briefcase }, { terms: ['clothes', 'clothing'], icon: Shirt },
];

const SLOT_ICON_OVERRIDES = { head: CUSTOM_ICONS.helmet, eyes: Eye, neck: CUSTOM_ICONS.amulet, shoulders: ChevronUp, chest: Shirt, back: CUSTOM_ICONS.cloak, arms: Badge, wrists: Badge, hands: Hand, waist: CUSTOM_ICONS.belt, legs: Footprints, feet: CUSTOM_ICONS.boots, mainHand: Sword, offHand: Shield, ranged: CUSTOM_ICONS.bow, ringLeft: CUSTOM_ICONS.ring, ringRight: CUSTOM_ICONS.ring };
const CATEGORY_FALLBACKS = { weapon: Swords, armor: Shirt, item: Package, accessory: Diamond, currency: Coins, treasure: Gem, consumable: FlaskConical, tool: Wrench, container: Archive, document: ScrollText, location: Landmark, food: Utensils, drink: Milk, valuables: Wallet };

const getSearchTerms = (props) => [
  ...splitTerms(props.equipmentSlot), ...splitTerms(props.weaponType), ...splitTerms(props.armorType), ...splitTerms(props.consumableType), ...splitTerms(props.magicItemType),
  ...splitTerms(props.category), ...splitTerms(props.itemType), ...splitTerms(props.item?.type), ...splitTerms(props.item?.category), ...splitTerms(props.item?.categories),
  ...splitTerms(props.item?.subtype || props.item?.subType), ...splitTerms(props.item?.slot), ...splitTerms(props.item?.equipmentSlot), ...splitTerms(props.item?.targetSlot), ...splitTerms(props.item?.targetSlots), ...splitTerms(props.item?.tags),
  ...splitTerms(props.item?.displayName || props.item?.name || props.item?.itemName || props.item?.weaponName || props.item?.armorName || props.item?.accessoryName),
];

export const resolveItemIcon = (props = {}) => {
  if (props.equipmentSlot && SLOT_ICON_OVERRIDES[props.equipmentSlot]) return SLOT_ICON_OVERRIDES[props.equipmentSlot];
  const terms = getSearchTerms(props);
  const rule = ICON_RULES.find(({ terms: candidates }) => candidates.some((candidate) => terms.some((term) => term.includes(candidate))));
  if (rule) return rule.icon;
  return CATEGORY_FALLBACKS[normalize(props.itemType || props.category)] || Package;
};

export default function ItemIcon({ item, itemType, category, rarity, equipmentSlot, weaponType, armorType, consumableType, magicItemType, size = 40, className = '', title, decorative = true }) {
  const Icon = resolveItemIcon({ item, itemType, category, equipmentSlot, weaponType, armorType, consumableType, magicItemType });
  const normalizedRarity = normalize(rarity || item?.rarity || 'common').replace(/\s+/g, '-');
  const label = title || item?.displayName || item?.name || category || itemType || equipmentSlot || 'Item';
  return <span className={`item-icon item-icon--${normalizedRarity} ${className}`.trim()} title={label} aria-hidden={decorative ? 'true' : undefined} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label} style={{ '--item-icon-size': `${size}px` }}><Icon size={Math.round(size * 0.6)} strokeWidth={1.9} /></span>;
}
