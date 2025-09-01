const baseFeatLevels = [4, 8, 12, 16, 19];
const fighterExtraFeatLevels = [6, 14];
const rogueExtraFeatLevels = [10];

/**
 * Calculate the number of feat slots a character has earned for a given class and level.
 * @param {string} className - The character's class name.
 * @param {number} level - The level within that class.
 * @returns {number} Number of feat slots.
 */
function calculateFeatSlots(className = '', level = 0) {
  let slots = baseFeatLevels.filter((l) => l <= level).length;
  const lower = className.toLowerCase();
  if (lower === 'fighter') {
    slots += fighterExtraFeatLevels.filter((l) => l <= level).length;
  }
  if (lower === 'rogue') {
    slots += rogueExtraFeatLevels.filter((l) => l <= level).length;
  }
  return slots;
}

/**
 * Calculate available stat points from leveling.
 * Currently characters do not gain stat points from leveling alone.
 * @returns {number} Always returns 0.
 */
function calculateStatPoints() {
  return 0;
}

module.exports = { calculateFeatSlots, calculateStatPoints };
