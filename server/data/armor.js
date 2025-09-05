/**
 * Player's Handbook armor.
 * Generated for proficiency checks.
 */
/** @typedef {import('../../types/armor').Armor} Armor */
/** @type {Record<string, Armor>} */
const armors = {
  padded: {
    name: "Padded",
    category: "light",
    ac: 11,
    maxDex: null,
    strength: null,
    stealth: true,
    weight: 8,
    cost: "5 gp",
    owned: false,
  },
  leather: {
    name: "Leather",
    category: "light",
    ac: 11,
    maxDex: null,
    strength: null,
    stealth: false,
    weight: 10,
    cost: "10 gp",
    owned: false,
  },
  "studded-leather": {
    name: "Studded Leather",
    category: "light",
    ac: 12,
    maxDex: null,
    strength: null,
    stealth: false,
    weight: 13,
    cost: "45 gp",
    owned: false,
  },
  hide: {
    name: "Hide",
    category: "medium",
    ac: 12,
    maxDex: 2,
    strength: null,
    stealth: false,
    weight: 12,
    cost: "10 gp",
    owned: false,
  },
  "chain-shirt": {
    name: "Chain Shirt",
    category: "medium",
    ac: 13,
    maxDex: 2,
    strength: null,
    stealth: false,
    weight: 20,
    cost: "50 gp",
    owned: false,
  },
  "scale-mail": {
    name: "Scale Mail",
    category: "medium",
    ac: 14,
    maxDex: 2,
    strength: null,
    stealth: true,
    weight: 45,
    cost: "50 gp",
    owned: false,
  },
  breastplate: {
    name: "Breastplate",
    category: "medium",
    ac: 14,
    maxDex: 2,
    strength: null,
    stealth: false,
    weight: 20,
    cost: "400 gp",
    owned: false,
  },
  "half-plate": {
    name: "Half Plate",
    category: "medium",
    ac: 15,
    maxDex: 2,
    strength: null,
    stealth: true,
    weight: 40,
    cost: "750 gp",
    owned: false,
  },
  "ring-mail": {
    name: "Ring Mail",
    category: "heavy",
    ac: 14,
    maxDex: 0,
    strength: null,
    stealth: true,
    weight: 40,
    cost: "30 gp",
    owned: false,
  },
  "chain-mail": {
    name: "Chain Mail",
    category: "heavy",
    ac: 16,
    maxDex: 0,
    strength: 13,
    stealth: true,
    weight: 55,
    cost: "75 gp",
    owned: false,
  },
  splint: {
    name: "Splint",
    category: "heavy",
    ac: 17,
    maxDex: 0,
    strength: 15,
    stealth: true,
    weight: 60,
    cost: "200 gp",
    owned: false,
  },
  plate: {
    name: "Plate",
    category: "heavy",
    ac: 18,
    maxDex: 0,
    strength: 15,
    stealth: true,
    weight: 65,
    cost: "1500 gp",
    owned: false,
  },
  shield: {
    name: "Shield",
    category: "shield",
    ac: 2,
    maxDex: null,
    strength: null,
    stealth: false,
    weight: 6,
    cost: "10 gp",
    owned: false,
  },
};

// Default the type of each armor to its key for canonical mapping
for (const [key, armor] of Object.entries(armors)) {
  armor.type = armor.type || key;
}
// Derive canonical option lists for client consumption
const types = Object.keys(armors);
const categories = [
  ...new Set(Object.values(armors).map((a) => a.category)),
];

module.exports = { armors, types, categories };
