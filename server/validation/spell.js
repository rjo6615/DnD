/**
 * @typedef {import('../../types/spell').Spell} Spell
 */

/**
 * Validate a value conforms to the Spell structure.
 * @param {any} spell
 * @returns {spell is Spell}
 */
function isSpell(spell) {
  return (
    spell !== null &&
    typeof spell === 'object' &&
    typeof spell.name === 'string' &&
    typeof spell.level === 'number' &&
    typeof spell.school === 'string' &&
    typeof spell.castingTime === 'string' &&
    typeof spell.range === 'string' &&
    Array.isArray(spell.components) &&
    spell.components.every(c => typeof c === 'string') &&
    typeof spell.duration === 'string' &&
    typeof spell.description === 'string' &&
    Array.isArray(spell.classes) &&
    spell.classes.every(c => typeof c === 'string') &&
    (spell.higherLevels === undefined || typeof spell.higherLevels === 'string') &&
    (spell.scaling === undefined ||
      (
        typeof spell.scaling === 'object' &&
        [5, 11, 17].every(l =>
          spell.scaling[l] === undefined || typeof spell.scaling[l] === 'string'
        )
      ))
  );
}

module.exports = { isSpell };
