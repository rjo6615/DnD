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
    ac: "11 + Dex modifier",
    properties: ["stealth disadvantage"],
    weight: 8,
    cost: "5 gp",
    proficient: false,
  },
  leather: {
    name: "Leather",
    category: "light",
    ac: "11 + Dex modifier",
    properties: [],
    weight: 10,
    cost: "10 gp",
    proficient: false,
  },
  "studded-leather": {
    name: "Studded Leather",
    category: "light",
    ac: "12 + Dex modifier",
    properties: [],
    weight: 13,
    cost: "45 gp",
    proficient: false,
  },
  hide: {
    name: "Hide",
    category: "medium",
    ac: "12 + Dex modifier (max 2)",
    properties: [],
    weight: 12,
    cost: "10 gp",
    proficient: false,
  },
  "chain-shirt": {
    name: "Chain Shirt",
    category: "medium",
    ac: "13 + Dex modifier (max 2)",
    properties: [],
    weight: 20,
    cost: "50 gp",
    proficient: false,
  },
  "scale-mail": {
    name: "Scale Mail",
    category: "medium",
    ac: "14 + Dex modifier (max 2)",
    properties: ["stealth disadvantage"],
    weight: 45,
    cost: "50 gp",
    proficient: false,
  },
  breastplate: {
    name: "Breastplate",
    category: "medium",
    ac: "14 + Dex modifier (max 2)",
    properties: [],
    weight: 20,
    cost: "400 gp",
    proficient: false,
  },
  "half-plate": {
    name: "Half Plate",
    category: "medium",
    ac: "15 + Dex modifier (max 2)",
    properties: ["stealth disadvantage"],
    weight: 40,
    cost: "750 gp",
    proficient: false,
  },
  "ring-mail": {
    name: "Ring Mail",
    category: "heavy",
    ac: "14",
    properties: ["stealth disadvantage"],
    weight: 40,
    cost: "30 gp",
    proficient: false,
  },
  "chain-mail": {
    name: "Chain Mail",
    category: "heavy",
    ac: "16",
    properties: ["strength 13", "stealth disadvantage"],
    weight: 55,
    cost: "75 gp",
    proficient: false,
  },
  splint: {
    name: "Splint",
    category: "heavy",
    ac: "17",
    properties: ["strength 15", "stealth disadvantage"],
    weight: 60,
    cost: "200 gp",
    proficient: false,
  },
  plate: {
    name: "Plate",
    category: "heavy",
    ac: "18",
    properties: ["strength 15", "stealth disadvantage"],
    weight: 65,
    cost: "1500 gp",
    proficient: false,
  },
  shield: {
    name: "Shield",
    category: "shield",
    ac: "+2",
    properties: [],
    weight: 6,
    cost: "10 gp",
    proficient: false,
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
const properties = [
  ...new Set(Object.values(armors).flatMap((a) => a.properties)),
];

module.exports = { armors, types, categories, properties };
