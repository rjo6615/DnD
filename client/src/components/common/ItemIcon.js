import React from 'react';
import {
  GiAmmoBox,
  GiAxeSword,
  GiBackpack,
  GiBattleAxe,
  GiBelt,
  GiBoots,
  GiBowArrow,
  GiBracers,
  GiBreastplate,
  GiBroadsword,
  GiCape,
  GiChainMail,
  GiChest,
  GiCheckedShield,
  GiCloak,
  GiCrossbow,
  GiCrystalBall,
  GiCrystalWand,
  GiCrown,
  GiDiceSixFacesSix,
  GiFlail,
  GiGauntlet,
  GiGems,
  GiHelmet,
  GiHolySymbol,
  GiKey,
  GiLeatherArmor,
  GiLockedChest,
  GiLockpicks,
  GiMagicLamp,
  GiMagicSwirl,
  GiMeat,
  GiMusicalNotes,
  GiNecklace,
  GiOakLeaf,
  GiOpenBook,
  GiPlainDagger,
  GiPotionBall,
  GiRing,
  GiScrollUnfurled,
  GiShield,
  GiSling,
  GiSpearFeather,
  GiSpearHook,
  GiSpellBook,
  GiStoneAxe,
  GiToolbox,
  GiTorch,
  GiTreasureMap,
  GiTwoCoins,
  GiTwoHandedSword,
  GiVisoredHelm,
  GiWarhammer,
  GiWizardStaff,
  GiWoodClub,
} from 'react-icons/gi';

const normalize = (value) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, ' ')
    : '';

const splitTerms = (value) => {
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean);
  const normalized = normalize(value);
  return normalized ? [normalized] : [];
};

const ICON_RULES = [
  { terms: ['greatclub', 'club'], icon: GiWoodClub },
  { terms: ['greatsword', 'two handed sword'], icon: GiTwoHandedSword },
  { terms: ['longsword', 'shortsword', 'scimitar', 'rapier', 'sword'], icon: GiBroadsword },
  { terms: ['dagger', 'knife', 'dart'], icon: GiPlainDagger },
  { terms: ['battleaxe', 'greataxe', 'axe'], icon: GiBattleAxe },
  { terms: ['handaxe', 'hatchet'], icon: GiStoneAxe },
  { terms: ['warhammer', 'maul', 'hammer'], icon: GiWarhammer },
  { terms: ['mace'], icon: GiAxeSword },
  { terms: ['flail'], icon: GiFlail },
  { terms: ['halberd', 'glaive'], icon: GiSpearHook },
  { terms: ['spear', 'javelin', 'lance', 'pike'], icon: GiSpearFeather },
  { terms: ['quarterstaff', 'staff'], icon: GiWizardStaff },
  { terms: ['crossbow'], icon: GiCrossbow },
  { terms: ['longbow', 'shortbow', 'bow'], icon: GiBowArrow },
  { terms: ['sling'], icon: GiSling },
  { terms: ['shield', 'buckler'], icon: GiShield },
  { terms: ['ammunition', 'arrow', 'bolt', 'sling bullet', 'ammo'], icon: GiAmmoBox },
  { terms: ['potion', 'flask', 'vial', 'elixir', 'poison', 'acid', 'oil'], icon: GiPotionBall },
  { terms: ['scroll', 'parchment'], icon: GiScrollUnfurled },
  { terms: ['spellbook', 'grimoire'], icon: GiSpellBook },
  { terms: ['book', 'tome', 'manual', 'journal'], icon: GiOpenBook },
  { terms: ['wand'], icon: GiCrystalWand },
  { terms: ['rod'], icon: GiMagicLamp },
  { terms: ['arcane focus', 'orb', 'crystal'], icon: GiCrystalBall },
  { terms: ['druidic focus'], icon: GiOakLeaf },
  { terms: ['holy symbol'], icon: GiHolySymbol },
  { terms: ['focus'], icon: GiMagicSwirl },
  { terms: ['helmet', 'helm', 'head'], icon: GiVisoredHelm },
  { terms: ['hat', 'circlet', 'crown', 'headband'], icon: GiCrown },
  { terms: ['shield'], icon: GiShield },
  { terms: ['plate', 'breastplate'], icon: GiBreastplate },
  { terms: ['mail', 'chain'], icon: GiChainMail },
  { terms: ['leather', 'hide', 'studded'], icon: GiLeatherArmor },
  { terms: ['armor', 'robe', 'chest'], icon: GiBreastplate },
  { terms: ['glove', 'gauntlet', 'hand'], icon: GiGauntlet },
  { terms: ['boot', 'shoe', 'feet', 'foot'], icon: GiBoots },
  { terms: ['belt', 'sash', 'girdle', 'waist'], icon: GiBelt },
  { terms: ['bracer', 'bracelet', 'wrist', 'vambrace'], icon: GiBracers },
  { terms: ['ring', 'band', 'signet'], icon: GiRing },
  { terms: ['amulet', 'necklace', 'pendant', 'torc', 'neck'], icon: GiNecklace },
  { terms: ['cloak', 'cape', 'mantle'], icon: GiCloak },
  { terms: ['back'], icon: GiCape },
  { terms: ['tool', 'artisan', 'kit', 'supplies'], icon: GiToolbox },
  { terms: ['lockpick', 'thieves'], icon: GiLockpicks },
  { terms: ['instrument', 'lute', 'flute', 'drum', 'horn', 'music'], icon: GiMusicalNotes },
  { terms: ['gaming set', 'dice', 'cards', 'game'], icon: GiDiceSixFacesSix },
  { terms: ['backpack', 'pack', 'adventuring gear'], icon: GiBackpack },
  { terms: ['torch', 'lantern', 'candle'], icon: GiTorch },
  { terms: ['map'], icon: GiTreasureMap },
  { terms: ['key'], icon: GiKey },
  { terms: ['treasure chest'], icon: GiLockedChest },
  { terms: ['chest', 'container', 'box', 'case', 'pouch', 'bag'], icon: GiChest },
  { terms: ['coin', 'currency', 'gold', 'silver', 'copper', 'platinum'], icon: GiTwoCoins },
  { terms: ['gem', 'jewel', 'diamond', 'treasure'], icon: GiGems },
  { terms: ['food', 'ration', 'meat', 'bread'], icon: GiMeat },
  { terms: ['material', 'crafting', 'ore', 'ingot'], icon: GiStoneAxe },
  { terms: ['quest', 'relic', 'artifact'], icon: GiMagicSwirl },
];

const SLOT_ICON_OVERRIDES = {
  head: GiVisoredHelm,
  eyes: GiHelmet,
  neck: GiNecklace,
  shoulders: GiCheckedShield,
  chest: GiBreastplate,
  back: GiCloak,
  arms: GiBracers,
  wrists: GiBracers,
  hands: GiGauntlet,
  waist: GiBelt,
  legs: GiLeatherArmor,
  feet: GiBoots,
  mainHand: GiBroadsword,
  offHand: GiShield,
  ranged: GiBowArrow,
  ringLeft: GiRing,
  ringRight: GiRing,
};

const CATEGORY_FALLBACKS = {
  weapon: GiBroadsword,
  armor: GiBreastplate,
  item: GiBackpack,
  accessory: GiGems,
  currency: GiTwoCoins,
  treasure: GiGems,
  consumable: GiPotionBall,
  tool: GiToolbox,
  container: GiChest,
  document: GiScrollUnfurled,
  valuables: GiGems,
};

const getSearchTerms = (props) => [
  ...splitTerms(props.equipmentSlot),
  ...splitTerms(props.weaponType),
  ...splitTerms(props.armorType),
  ...splitTerms(props.consumableType),
  ...splitTerms(props.magicItemType),
  ...splitTerms(props.category),
  ...splitTerms(props.itemType),
  ...splitTerms(props.item?.type),
  ...splitTerms(props.item?.category),
  ...splitTerms(props.item?.categories),
  ...splitTerms(props.item?.subtype || props.item?.subType),
  ...splitTerms(props.item?.slot),
  ...splitTerms(props.item?.equipmentSlot),
  ...splitTerms(props.item?.targetSlot),
  ...splitTerms(props.item?.targetSlots),
  ...splitTerms(props.item?.tags),
  ...splitTerms(
    props.item?.displayName ||
      props.item?.name ||
      props.item?.itemName ||
      props.item?.weaponName ||
      props.item?.armorName ||
      props.item?.accessoryName
  ),
];

export const resolveItemIcon = (props = {}) => {
  if (props.equipmentSlot && SLOT_ICON_OVERRIDES[props.equipmentSlot]) {
    return SLOT_ICON_OVERRIDES[props.equipmentSlot];
  }

  const terms = getSearchTerms(props);
  const rule = ICON_RULES.find(({ terms: candidates }) =>
    candidates.some((candidate) => terms.some((term) => term.includes(candidate)))
  );

  if (rule) return rule.icon;
  return CATEGORY_FALLBACKS[normalize(props.itemType || props.category)] || GiBackpack;
};

export default function ItemIcon({
  item,
  itemType,
  category,
  rarity,
  equipmentSlot,
  weaponType,
  armorType,
  consumableType,
  magicItemType,
  size = 40,
  className = '',
  title,
  decorative = true,
}) {
  const Icon = resolveItemIcon({
    item,
    itemType,
    category,
    equipmentSlot,
    weaponType,
    armorType,
    consumableType,
    magicItemType,
  });
  const normalizedRarity = normalize(rarity || item?.rarity || 'common').replace(/\s+/g, '-');
  const label = title || item?.displayName || item?.name || category || itemType || equipmentSlot || 'Item';

  return (
    <span
      className={`item-icon item-icon--${normalizedRarity} ${className}`.trim()}
      title={label}
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      style={{ '--item-icon-size': `${size}px` }}
    >
      <Icon size={Math.round(size * 0.68)} />
    </span>
  );
}
