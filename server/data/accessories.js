const { EQUIPMENT_SLOT_LAYOUT } = require('../constants/equipmentSlots');

const categories = [
  'amulet',
  'belt',
  'bracelet',
  'brooch',
  'cape',
  'cloak',
  'goggles',
  'mask',
  'ring',
  'sash',
  'wrap',
];

const slotKeys = ['eyes', 'wrists', 'neck', 'waist', 'back', 'ringLeft', 'ringRight'];

const slotMap = new Map(EQUIPMENT_SLOT_LAYOUT.flat().map((slot) => [slot.key, slot]));

const slots = slotKeys.map((key) => slotMap.get(key) || { key, label: key });

module.exports = {
  categories,
  slots,
  slotKeys,
};
