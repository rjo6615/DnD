export const EQUIPMENT_SLOT_LAYOUT = [
  [
    { key: 'head', label: 'Head' },
    { key: 'eyes', label: 'Eyes' },
    { key: 'neck', label: 'Neck' },
    { key: 'shoulders', label: 'Shoulders' },
  ],
  [
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'arms', label: 'Arms' },
    { key: 'wrists', label: 'Wrists' },
  ],
  [
    { key: 'hands', label: 'Hands' },
    { key: 'waist', label: 'Waist' },
    { key: 'legs', label: 'Legs' },
    { key: 'feet', label: 'Feet' },
  ],
  [
    { key: 'mainHand', label: 'Main Hand' },
    { key: 'offHand', label: 'Off Hand' },
    { key: 'ringLeft', label: 'Ring I' },
    { key: 'ringRight', label: 'Ring II' },
  ],
];

export const EQUIPMENT_SLOT_KEYS = EQUIPMENT_SLOT_LAYOUT.flat().map((slot) => slot.key);
