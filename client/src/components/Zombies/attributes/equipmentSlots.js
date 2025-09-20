const createSlot = (key, label, config = {}) => ({
  key,
  label,
  allowedSources: config.allowedSources,
  filters: config.filters || {},
});

export const EQUIPMENT_SLOT_LAYOUT = [
  [
    createSlot('head', 'Head', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['head', 'helm', 'helmet', 'hat', 'circlet', 'crown'],
        },
        armor: {
          categories: ['helm', 'helmet', 'head'],
        },
      },
    }),
    createSlot('eyes', 'Eyes', {
      allowedSources: ['item'],
      filters: {
        item: {
          categories: ['eye', 'eyes', 'goggles', 'lens', 'visor', 'glasses'],
        },
      },
    }),
    createSlot('neck', 'Neck', {
      allowedSources: ['item'],
      filters: {
        item: {
          categories: ['neck', 'amulet', 'necklace', 'pendant', 'torc'],
        },
      },
    }),
    createSlot('shoulders', 'Shoulders', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['shoulder', 'cloak', 'cape', 'mantle'],
        },
        armor: {
          categories: ['shoulder', 'cloak', 'cape', 'mantle'],
        },
      },
    }),
  ],
  [
    createSlot('chest', 'Chest', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['armor', 'chest', 'vest', 'robe', 'mail', 'shirt', 'plate'],
        },
      },
    }),
    createSlot('back', 'Back', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['back', 'cloak', 'cape', 'mantle'],
        },
        armor: {
          categories: ['back', 'cloak', 'cape', 'mantle'],
        },
      },
    }),
    createSlot('arms', 'Arms', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['arm', 'arms', 'bracer', 'sleeve'],
        },
        armor: {
          categories: ['arm', 'arms', 'bracer', 'vambrace'],
        },
      },
    }),
    createSlot('wrists', 'Wrists', {
      allowedSources: ['item'],
      filters: {
        item: {
          categories: ['wrist', 'bracelet', 'bracer', 'cuff'],
        },
      },
    }),
  ],
  [
    createSlot('hands', 'Hands', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['hand', 'hands', 'glove', 'gauntlet', 'mitt'],
        },
        armor: {
          categories: ['hand', 'hands', 'glove', 'gauntlet', 'mitt'],
        },
      },
    }),
    createSlot('waist', 'Waist', {
      allowedSources: ['item'],
      filters: {
        item: {
          categories: ['belt', 'waist', 'sash', 'girdle'],
        },
      },
    }),
    createSlot('legs', 'Legs', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['leg', 'legs', 'greaves', 'leggings', 'pants', 'skirt'],
        },
        armor: {
          categories: ['leg', 'legs', 'greaves', 'leggings', 'pants', 'skirt'],
        },
      },
    }),
    createSlot('feet', 'Feet', {
      allowedSources: ['armor', 'item'],
      filters: {
        item: {
          categories: ['feet', 'foot', 'boot', 'boots', 'shoe', 'sandals', 'slippers'],
        },
        armor: {
          categories: ['feet', 'foot', 'boot', 'boots', 'shoe', 'sandals', 'slippers'],
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
      allowedSources: ['item'],
      filters: {
        item: {
          categories: ['ring', 'band', 'signet'],
        },
      },
    }),
    createSlot('ringRight', 'Ring II', {
      allowedSources: ['item'],
      filters: {
        item: {
          categories: ['ring', 'band', 'signet'],
        },
      },
    }),
  ],
];

export const EQUIPMENT_SLOT_KEYS = EQUIPMENT_SLOT_LAYOUT.flat().map((slot) => slot.key);
