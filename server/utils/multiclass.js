const ObjectId = require('mongodb').ObjectId;
const dbo = require('../db/conn');
const { skillNames } = require('../routes/fieldConstants');
const multiclassProficiencies = require('../data/multiclassProficiencies');
const classes = require('../data/classes');
const collectAllowedSkills = require('./collectAllowedSkills');

const prereqs = {
  barbarian: { all: ['str'], min: 13 },
  bard: { all: ['cha'], min: 13 },
  cleric: { all: ['wis'], min: 13 },
  druid: { all: ['wis'], min: 13 },
  fighter: { any: ['str', 'dex'], min: 13 },
  monk: { all: ['dex', 'wis'], min: 13 },
  paladin: { all: ['str', 'cha'], min: 13 },
  ranger: { all: ['dex', 'wis'], min: 13 },
  rogue: { all: ['dex'], min: 13 },
  sorcerer: { all: ['cha'], min: 13 },
  warlock: { all: ['cha'], min: 13 },
  wizard: { all: ['int'], min: 13 },
};

function getTotalStat(character = {}, stat = '') {
  let total = Number(character[stat] || 0);
  if (character?.race?.abilities && character.race.abilities[stat] != null) {
    total += Number(character.race.abilities[stat] || 0);
  }
  if (
    character?.abilityScoreImprovement
    && character.abilityScoreImprovement[stat] != null
  ) {
    total += Number(character.abilityScoreImprovement[stat] || 0);
  }
  if (Array.isArray(character.feat)) {
    character.feat.forEach((ft) => {
      if (ft && typeof ft === 'object') total += Number(ft[stat] || 0);
    });
  }
  if (Array.isArray(character.occupation)) {
    character.occupation.forEach((occ) => {
      if (occ && typeof occ === 'object') total += Number(occ[stat] || 0);
    });
  }
  if (Array.isArray(character.item)) {
    const indexMap = { str: 2, dex: 3, con: 4, int: 5, wis: 6, cha: 7 };
    character.item.forEach((it) => {
      if (Array.isArray(it)) {
        const idx = indexMap[stat];
        if (idx != null) total += Number(it[idx] || 0);
      } else if (it && typeof it === 'object') {
        total += Number(it[stat] || 0);
      }
    });
  }
  return total;
}

function canMulticlass(character = {}, newOccupation = '') {
  const name = typeof newOccupation === 'string' ? newOccupation.toLowerCase() : '';
  const req = prereqs[name];
  if (!req) return { allowed: true };
  if (req.all) {
    const ok = req.all.every((stat) => getTotalStat(character, stat) >= req.min);
    if (ok) return { allowed: true };
    return {
      allowed: false,
      message: `Requires ${req.all.map((s) => s.toUpperCase()).join(' and ')} ${req.min}`,
    };
  }
  if (req.any) {
    const ok = req.any.some((stat) => getTotalStat(character, stat) >= req.min);
    if (ok) return { allowed: true };
    return {
      allowed: false,
      message: `Requires ${req.any.map((s) => s.toUpperCase()).join(' or ')} ${req.min}`,
    };
  }
  return { allowed: true };
}

async function applyMulticlass(characterId, newOccupation) {
  const db = await dbo();
  const characters = db.collection('Characters');
  const _id = new ObjectId(characterId);
  const character = await characters.findOne({ _id });
  if (!character) throw new Error('Character not found');

  const exists = Array.isArray(character.occupation)
    && character.occupation.some((o) => (o.Occupation || o.Name) === newOccupation);
  if (exists) {
    return { allowed: false, message: 'Occupation already taken' };
  }

  const validation = canMulticlass(character, newOccupation);
  if (!validation.allowed) return validation;

  const key = newOccupation.toLowerCase();
  const classInfo = classes[key];
  if (!classInfo) throw new Error('Occupation not found');

  const granted = multiclassProficiencies[key] || [];
  const skills = {};
  skillNames.forEach((skill) => {
    skills[skill] = {
      proficient: granted.includes(skill),
      expertise: false,
    };
  });

  const occEntry = {
    Occupation: classInfo.name,
    Health: classInfo.hitDie,
    armor: classInfo.proficiencies.armor,
    weapons: classInfo.proficiencies.weapons,
    tools: classInfo.proficiencies.tools,
    savingThrows: classInfo.proficiencies.savingThrows,
    Level: 1,
    skills,
    proficiencyPoints: 0,
  };
  const hpGain = Math.floor(Math.random() * classInfo.hitDie) + 1;
  const newHealth = (character.health || 0) + hpGain;

  const updatedOccupation = Array.isArray(character.occupation)
    ? [...character.occupation, occEntry]
    : [occEntry];
  const allowedSkills = collectAllowedSkills(
    updatedOccupation,
    character.feat,
    character.race,
    character.background,
  );

  await characters.updateOne(
    { _id },
    {
      $set: {
        occupation: updatedOccupation,
        health: newHealth,
        allowedSkills,
      },
    }
  );

  return { allowed: true, occupation: updatedOccupation, health: newHealth, allowedSkills };
}

module.exports = { canMulticlass, applyMulticlass };
