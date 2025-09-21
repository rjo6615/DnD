const createSlot = (key, label, config = {}) => ({
  key,
  label,
  allowedSources: config.allowedSources,
  filters: config.filters || {},
});

export const EQUIPMENT_SLOT_LAYOUT = [
  [
    createSlot('head', 'Head', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: [
            'head',
            'helm',
            'helmet',
            'hat',
            'circlet',
            'crown',
            'headband',
          ],
        },
        armor: {
          categories: ['helm', 'helmet', 'head'],
        },
        accessory: {
          categories: [
            'head',
            'helm',
            'helmet',
            'hat',
            'circlet',
            'crown',
            'headband',
          ],
          targetSlots: ['head'],
        },
      },
    }),
    createSlot('eyes', 'Eyes', {
      allowedSources: ['item', 'accessory'],
      filters: {
        item: {
          categories: ['eye', 'eyes', 'goggles', 'lens', 'visor', 'glasses'],
        },
        accessory: {
          categories: ['eye', 'eyes', 'goggles', 'lens', 'visor', 'glasses'],
          targetSlots: ['eyes'],
        },
      },
    }),
    createSlot('neck', 'Neck', {
      allowedSources: ['item', 'accessory'],
      filters: {
        item: {
          categories: ['neck', 'amulet', 'necklace', 'pendant', 'torc'],
        },
        accessory: {
          categories: ['neck', 'amulet', 'necklace', 'pendant', 'torc'],
          targetSlots: ['neck'],
        },
      },
    }),
    createSlot('shoulders', 'Shoulders', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['shoulder', 'cloak', 'cape', 'mantle'],
        },
        armor: {
          categories: ['shoulder', 'cloak', 'cape', 'mantle'],
        },
        accessory: {
          categories: ['shoulder', 'cloak', 'cape', 'mantle'],
          targetSlots: ['shoulders', 'back'],
        },
      },
    }),
  ],
  [
    createSlot('chest', 'Chest', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['armor', 'chest', 'vest', 'robe', 'mail', 'shirt', 'plate'],
        },
        accessory: {
          categories: ['armor', 'chest', 'vest', 'robe', 'mail', 'shirt', 'plate'],
          targetSlots: ['chest'],
        },
      },
    }),
    createSlot('back', 'Back', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['back', 'cloak', 'cape', 'mantle'],
        },
        armor: {
          categories: ['back', 'cloak', 'cape', 'mantle'],
        },
        accessory: {
          categories: ['back', 'cloak', 'cape', 'mantle', 'wings'],
          targetSlots: ['back', 'shoulders'],
        },
      },
    }),
    createSlot('arms', 'Arms', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['arm', 'arms', 'bracer', 'sleeve'],
        },
        armor: {
          categories: ['arm', 'arms', 'bracer', 'vambrace'],
        },
        accessory: {
          categories: ['arm', 'arms', 'bracer', 'sleeve', 'vambrace'],
          targetSlots: ['arms'],
        },
      },
    }),
    createSlot('wrists', 'Wrists', {
      allowedSources: ['item', 'accessory'],
      filters: {
        item: {
          categories: ['wrist', 'bracelet', 'bracer', 'cuff'],
        },
        accessory: {
          categories: ['wrist', 'bracelet', 'bracer', 'cuff'],
          targetSlots: ['wrists'],
        },
      },
    }),
  ],
  [
    createSlot('hands', 'Hands', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['hand', 'hands', 'glove', 'gauntlet', 'mitt'],
        },
        armor: {
          categories: ['hand', 'hands', 'glove', 'gauntlet', 'mitt'],
        },
        accessory: {
          categories: ['hand', 'hands', 'glove', 'gauntlet', 'mitt'],
          targetSlots: ['hands'],
        },
      },
    }),
    createSlot('waist', 'Waist', {
      allowedSources: ['item', 'accessory'],
      filters: {
        item: {
          categories: ['belt', 'waist', 'sash', 'girdle'],
        },
        accessory: {
          categories: ['belt', 'waist', 'sash', 'girdle'],
          targetSlots: ['waist'],
        },
      },
    }),
    createSlot('legs', 'Legs', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['leg', 'legs', 'greaves', 'leggings', 'pants', 'skirt'],
        },
        armor: {
          categories: ['leg', 'legs', 'greaves', 'leggings', 'pants', 'skirt'],
        },
        accessory: {
          categories: ['leg', 'legs', 'greaves', 'leggings', 'pants', 'skirt'],
          targetSlots: ['legs'],
        },
      },
    }),
    createSlot('feet', 'Feet', {
      allowedSources: ['armor', 'item', 'accessory'],
      filters: {
        item: {
          categories: ['feet', 'foot', 'boot', 'boots', 'shoe', 'sandals', 'slippers'],
        },
        armor: {
          categories: ['feet', 'foot', 'boot', 'boots', 'shoe', 'sandals', 'slippers'],
        },
        accessory: {
          categories: ['feet', 'foot', 'boot', 'boots', 'shoe', 'sandals', 'slippers'],
          targetSlots: ['feet'],
        },
      },
    }),
  ],
  [
    createSlot('mainHand', 'Main Hand', {
      allowedSources: ['weapon'],
    }),
    createSlot('offHand', 'Off Hand', {
      allowedSources: ['weapon', 'armor'],
      filters: {
        armor: {
          categories: ['shield'],
        },
      },
    }),
    createSlot('ranged', 'Ranged', {
      allowedSources: ['weapon'],
      filters: {
        weapon: {
          categories: ['ranged', 'bow', 'crossbow', 'thrown', 'gun'],
        },
      },
    }),
    createSlot('ringLeft', 'Ring I', {
      allowedSources: ['item', 'accessory'],
      filters: {
        item: {
          categories: ['ring', 'band', 'signet'],
        },
        accessory: {
          categories: ['ring', 'band', 'signet'],
          targetSlots: ['ring', 'ringleft'],
        },
      },
    }),
    createSlot('ringRight', 'Ring II', {
      allowedSources: ['item', 'accessory'],
      filters: {
        item: {
          categories: ['ring', 'band', 'signet'],
        },
        accessory: {
          categories: ['ring', 'band', 'signet'],
          targetSlots: ['ring', 'ringright'],
        },
      },
    }),
  ],
];

export const EQUIPMENT_SLOT_KEYS = EQUIPMENT_SLOT_LAYOUT.flat().map((slot) => slot.key);
