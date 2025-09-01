const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');

// Map each skill to its associated ability score
const skillAbilityMap = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
};

function abilityMod(score = 10) {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(totalLevel = 0) {
  if (totalLevel >= 17) return 6;
  if (totalLevel >= 13) return 5;
  if (totalLevel >= 9) return 4;
  if (totalLevel >= 5) return 3;
  return 2;
}

module.exports = (router) => {
  const skillsRouter = express.Router();

  // Apply authentication to all skills routes
  skillsRouter.use(authenticateToken);

  // Update a single skill's proficiency/expertise and return its modifier
  skillsRouter.route('/update-skills/:id').put(async (req, res, next) => {
    const id = { _id: ObjectId(req.params.id) };
    const db_connect = req.db;
    const { skill, proficient = false, expertise = false } = req.body;

    if (!skill || !skillAbilityMap[skill]) {
      return res.status(400).json({ message: 'Invalid skill' });
    }

    try {
      const update = {
        $set: { [`skills.${skill}`]: { proficient, expertise } },
      };
      const result = await db_connect
        .collection('Characters')
        .findOneAndUpdate(id, update, { returnDocument: 'after' });

      const character = result.value;
      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const abilityScore = character[skillAbilityMap[skill]];
      const base = abilityMod(abilityScore);

      const totalLevel = Array.isArray(character.occupation)
        ? character.occupation.reduce((sum, o) => sum + (o.Level || 0), 0)
        : 0;
      const profBonus = proficiencyBonus(totalLevel);
      const multiplier = expertise ? 2 : proficient ? 1 : 0;
      const modifier = base + profBonus * multiplier;

      res.status(200).json({ skill, proficient, expertise, modifier });
    } catch (err) {
      next(err);
    }
  });

  router.use('/skills', skillsRouter);
};
