const ObjectId = require('mongodb').ObjectId;
const dbo = require('../db/conn');
const { skillNames } = require('../routes/fieldConstants');
const multiclassProficiencies = require('../data/multiclassProficiencies');

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

function canMulticlass(character = {}, newOccupation = '') {
  const name = typeof newOccupation === 'string' ? newOccupation.toLowerCase() : '';
  const req = prereqs[name];
  if (!req) return { allowed: true };
  if (req.all) {
    const ok = req.all.every((stat) => Number(character[stat]) >= req.min);
    if (ok) return { allowed: true };
    return {
      allowed: false,
      message: `Requires ${req.all.map((s) => s.toUpperCase()).join(' and ')} ${req.min}`,
    };
  }
  if (req.any) {
    const ok = req.any.some((stat) => Number(character[stat]) >= req.min);
    if (ok) return { allowed: true };
    return {
      allowed: false,
      message: `Requires ${req.any.map((s) => s.toUpperCase()).join(' or ')} ${req.min}`,
    };
  }
  return { allowed: true };
}

function collectAllowedSkills(occupation = []) {
  if (!Array.isArray(occupation)) return [];
  const allowed = new Set();
  occupation.forEach((occ) => {
    if (occ && occ.skills && typeof occ.skills === 'object') {
      Object.keys(occ.skills).forEach((skill) => {
        if (occ.skills[skill] && occ.skills[skill].proficient) {
          allowed.add(skill);
        }
      });
    }
  });
  return Array.from(allowed);
}

async function applyMulticlass(characterId, newOccupation) {
  const db = await dbo();
  const characters = db.collection('Characters');
  const occupations = db.collection('Occupations');
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

  const occDoc = await occupations.findOne({ Occupation: newOccupation });
  if (!occDoc) throw new Error('Occupation not found');

  const granted = multiclassProficiencies[newOccupation.toLowerCase()] || [];
  const skills = {};
  skillNames.forEach((skill) => {
    skills[skill] = {
      proficient: granted.includes(skill),
      expertise: false,
    };
    delete occDoc[skill];
  });
  delete occDoc.skillMod;
  delete occDoc.proficiencyPoints;

  const occEntry = {
    ...occDoc,
    Level: 1,
    skills,
    proficiencyPoints: 0,
  };
  const hpGain = Math.floor(Math.random() * occDoc.Health) + 1;
  const newHealth = (character.health || 0) + hpGain;

  const updatedOccupation = Array.isArray(character.occupation)
    ? [...character.occupation, occEntry]
    : [occEntry];
  const allowedSkills = collectAllowedSkills(updatedOccupation);

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
