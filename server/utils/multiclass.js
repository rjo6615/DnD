const ObjectId = require('mongodb').ObjectId;
const dbo = require('../db/conn');
const { skillNames } = require('../routes/fieldConstants');
const multiclassProficiencies = require('../data/multiclassProficiencies');
const classes = require('../data/classes');
const collectAllowedSkills = require('./collectAllowedSkills');
const collectAllowedExpertise = require('./collectAllowedExpertise');

const countFeatProficiencies = (feat = []) => {
  const profs = new Set();
  if (Array.isArray(feat)) {
    feat.forEach((ft) => {
      if (ft && ft.skills && typeof ft.skills === 'object') {
        Object.keys(ft.skills).forEach((skill) => {
          if (ft.skills[skill] && ft.skills[skill].proficient) {
            profs.add(skill);
          }
        });
      }
    });
  }
  return profs.size;
};

const countRaceProficiencies = (race) => {
  if (race && race.skills && typeof race.skills === 'object') {
    return Object.values(race.skills).filter((s) => s && s.proficient).length;
  }
  return 0;
};

const countBackgroundProficiencies = (background) => {
  if (background && background.skills && typeof background.skills === 'object') {
    return Object.values(background.skills).filter((s) => s && s.proficient).length;
  }
  return 0;
};

const countFeatExpertise = (feat = []) => {
  let count = 0;
  if (Array.isArray(feat)) {
    feat.forEach((ft) => {
      if (ft && ft.skills && typeof ft.skills === 'object') {
        Object.values(ft.skills).forEach((info) => {
          if (info && info.expertise) count += 1;
        });
      }
    });
  }
  return count;
};

const countRaceExpertise = (race) => {
  if (race && race.skills && typeof race.skills === 'object') {
    return Object.values(race.skills).filter((s) => s && s.expertise).length;
  }
  return 0;
};

const countBackgroundExpertise = (background) => {
  if (background && background.skills && typeof background.skills === 'object') {
    return Object.values(background.skills).filter((s) => s && s.expertise).length;
  }
  return 0;
};

const countClassExpertise = (occupation = []) => {
  let count = 0;
  if (Array.isArray(occupation)) {
    occupation.forEach((occ) => {
      const name = (
        typeof occ.Occupation === 'string'
          ? occ.Occupation
          : typeof occ.Name === 'string'
          ? occ.Name
          : ''
      ).toLowerCase();
      const level = occ.Level || occ.level || 0;
      if (name === 'rogue') {
        if (level >= 1) count += 2;
        if (level >= 6) count += 2;
      }
      if (name === 'bard') {
        if (level >= 3) count += 2;
        if (level >= 10) count += 2;
      }
    });
  }
  return count;
};

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
    casterProgression: classInfo.casterProgression,
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

  const allowedExpertise = collectAllowedExpertise(
    updatedOccupation,
    character.feat,
    character.race,
    character.background,
  );

  const occupationPoints = Array.isArray(updatedOccupation)
    ? updatedOccupation.reduce(
        (sum, o) => sum + Number(o.proficiencyPoints || 0),
        0,
      )
    : 0;
  const featPoints = countFeatProficiencies(character.feat);
  const racePoints = countRaceProficiencies(character.race);
  const backgroundPoints = countBackgroundProficiencies(character.background);
  const proficiencyPoints =
    occupationPoints + featPoints + racePoints + backgroundPoints;

  const classExpertise = countClassExpertise(updatedOccupation);
  const featExpertise = countFeatExpertise(character.feat);
  const raceExpertise = countRaceExpertise(character.race);
  const backgroundExpertise = countBackgroundExpertise(character.background);
  const expertisePoints =
    classExpertise + featExpertise + raceExpertise + backgroundExpertise;

  await characters.updateOne(
    { _id },
    {
      $set: {
        occupation: updatedOccupation,
        health: newHealth,
        allowedSkills,
        allowedExpertise,
        proficiencyPoints,
        expertisePoints,
      },
    }
  );

  return {
    allowed: true,
    occupation: updatedOccupation,
    health: newHealth,
    allowedSkills,
    allowedExpertise,
    proficiencyPoints,
    expertisePoints,
  };
}

module.exports = { canMulticlass, applyMulticlass };
