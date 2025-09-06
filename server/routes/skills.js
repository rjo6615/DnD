const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const proficiencyBonus = require('../utils/proficiency');

const collectAllowedSkills = require('../utils/collectAllowedSkills');

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
      // Fetch character to determine proficiency bonus from total level
      const charDoc = await db_connect
        .collection('Characters')
        .findOne(id);

      if (!charDoc) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const raceProficient = !!(
        charDoc.race?.skills?.[skill]?.proficient
      );

      const allowedSkills = collectAllowedSkills(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race
      );
      if (!allowedSkills.includes(skill)) {
        return res.status(400).json({ message: 'Skill not allowed' });
      }

      if (raceProficient && !proficient) {
        return res
          .status(400)
          .json({ message: 'Cannot remove racial proficiency' });
      }

      const proficientCount = Object.entries(charDoc.skills || {}).filter(
        ([key, s]) =>
          s &&
          s.proficient &&
          !charDoc.race?.skills?.[key]?.proficient
      ).length;
      const alreadyProficient = charDoc.skills?.[skill]?.proficient;
      if (
        proficient &&
        !alreadyProficient &&
        proficientCount >= (charDoc.proficiencyPoints || 0)
      ) {
        return res
          .status(400)
          .json({ message: 'No proficiency points remaining' });
      }

      const totalLevel = Array.isArray(charDoc.occupation)
        ? charDoc.occupation.reduce((sum, o) => sum + (o.Level || 0), 0)
        : 0;
      const profBonus = proficiencyBonus(totalLevel);

      const update = {
        $set: {
          [`skills.${skill}`]: { proficient, expertise },
          proficiencyBonus: profBonus,
          allowedSkills,
        },
      };

      const result = await db_connect
        .collection('Characters')
        .findOneAndUpdate(id, update, { returnDocument: 'after' });

      const character = result.value;
      const abilityScore = character[skillAbilityMap[skill]];
      const base = abilityMod(abilityScore);
      const multiplier = expertise ? 2 : proficient ? 1 : 0;
      const modifier = base + profBonus * multiplier;

      res
        .status(200)
        .json({ skill, proficient, expertise, modifier, proficiencyBonus: profBonus });
    } catch (err) {
      next(err);
    }
  });

  router.use('/skills', skillsRouter);
};
