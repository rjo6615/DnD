function proficiencyBonus(totalLevel = 0) {
  if (totalLevel >= 17) return 6;
  if (totalLevel >= 13) return 5;
  if (totalLevel >= 9) return 4;
  if (totalLevel >= 5) return 3;
  return 2;
}
module.exports = proficiencyBonus;
