const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const characterLevel = (character) => (Array.isArray(character?.occupation)
  ? character.occupation.reduce((sum, entry) => sum + Math.max(0, numberOrZero(entry?.Level)), 0)
  : 0);

const constitutionModifier = (character) => {
  const racialBonus = numberOrZero(character?.race?.abilities?.con);
  const score = numberOrZero(character?.con) + racialBonus;
  return Math.floor((score - 10) / 2);
};

const collectHpBonuses = (entries) => (Array.isArray(entries) ? entries : [])
  .filter((entry) => entry && typeof entry === 'object' && entry.owned !== false)
  .reduce((total, entry) => total
    + numberOrZero(entry.hpMaxBonus)
    + numberOrZero(entry.numericBonuses?.hpMaxBonus), 0);

const collectPerLevelBonuses = (entries) => (Array.isArray(entries) ? entries : [])
  .filter((entry) => entry && typeof entry === 'object' && entry.owned !== false)
  .reduce((total, entry) => total
    + numberOrZero(entry.hpMaxBonusPerLevel)
    + numberOrZero(entry.numericBonuses?.hpMaxBonusPerLevel), 0);

const equipmentEntries = (character) => character?.equipment && typeof character.equipment === 'object'
  ? Object.values(character.equipment).filter(Boolean)
  : [];

const resolveCharacterMaxHp = (character) => {
  const level = characterLevel(character);
  const collections = [
    ...(Array.isArray(character?.feat) ? character.feat : []),
    ...(Array.isArray(character?.item) ? character.item : []),
    ...(Array.isArray(character?.accessories) ? character.accessories : []),
    ...equipmentEntries(character),
  ];
  const flatBonus = numberOrZero(character?.hpMaxBonus)
    + numberOrZero(character?.race?.hpMaxBonus)
    + collectHpBonuses(collections);
  const perLevelBonus = numberOrZero(character?.hpMaxBonusPerLevel)
    + numberOrZero(character?.race?.hpMaxBonusPerLevel)
    + collectPerLevelBonuses(collections);
  return Math.max(0, numberOrZero(character?.health)
    + constitutionModifier(character) * level
    + flatBonus
    + perLevelBonus * level);
};

const resolveHitDie = (character) => {
  const occupations = Array.isArray(character?.occupation) ? character.occupation : [];
  const entry = occupations.find((occupation) => numberOrZero(occupation?.Health ?? occupation?.hitDie) > 0);
  return Math.max(1, Math.floor(numberOrZero(entry?.Health ?? entry?.hitDie ?? character?.health)));
};

module.exports = { characterLevel, constitutionModifier, resolveCharacterMaxHp, resolveHitDie };
