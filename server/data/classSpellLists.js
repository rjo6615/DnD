const spells = require('./spells');

/**
 * Mapping of class identifiers to the list of spell IDs they can cast.
 * Generated from the SRD spells data.
 * @type {Record<string, string[]>}
 */
const classSpellLists = {};

for (const [id, spell] of Object.entries(spells)) {
  if (!Array.isArray(spell.classes)) continue;
  spell.classes.forEach(cls => {
    const key = cls.toLowerCase();
    if (!classSpellLists[key]) classSpellLists[key] = [];
    classSpellLists[key].push(id);
  });
}

// Ensure deterministic order for easier comparisons/tests.
Object.keys(classSpellLists).forEach(key => {
  classSpellLists[key].sort();
});

module.exports = classSpellLists;
