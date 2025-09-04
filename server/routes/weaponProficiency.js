const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');

// Collect allowed and granted weapons from occupation, feat, and race
function collectWeaponInfo(occupation = [], feat = [], race) {
  const allowed = new Set();
  const granted = new Set();
  const processSource = (src) => {
    if (!src) return;
    const weapons = src.weapons || src.weaponProficiencies;
    if (!weapons) return;
    if (Array.isArray(weapons)) {
      weapons.forEach((w) => {
        allowed.add(w);
        granted.add(w);
      });
    } else if (typeof weapons === 'object') {
      Object.keys(weapons).forEach((w) => {
        allowed.add(w);
        const val = weapons[w];
        if (val === true || (val && val.proficient)) {
          granted.add(w);
        }
      });
    }
  };
  if (Array.isArray(occupation)) occupation.forEach(processSource);
  if (Array.isArray(feat)) feat.forEach(processSource);
  processSource(race);
  return { allowed: Array.from(allowed), granted: Array.from(granted) };
}

module.exports = (router) => {
  const wpRouter = express.Router();

  // authentication for all weapon proficiency routes
  wpRouter.use(authenticateToken);

  // Get allowed and proficient weapons for a character
  wpRouter.get('/:id', async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const db = req.db;
    const id = { _id: ObjectId(req.params.id) };

    try {
      const charDoc = await db.collection('Characters').findOne(id);
      if (!charDoc) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const { allowed, granted } = collectWeaponInfo(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race
      );

      const proficient = new Set(granted);
      const manual = charDoc.weaponProficiencies || {};
      Object.keys(manual).forEach((w) => {
        if (manual[w]) {
          proficient.add(w);
        } else {
          proficient.delete(w);
        }
      });

      return res.status(200).json({
        allowed,
        proficient: Array.from(proficient),
      });
    } catch (err) {
      next(err);
    }
  });

  // Toggle weapon proficiency
  wpRouter.put('/:id', async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const { weapon, proficient = false } = req.body || {};
    if (typeof weapon !== 'string' || !weapon.trim()) {
      return res.status(400).json({ message: 'Invalid weapon' });
    }

    const db = req.db;
    const id = { _id: ObjectId(req.params.id) };

    try {
      const charDoc = await db.collection('Characters').findOne(id);
      if (!charDoc) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const { allowed, granted } = collectWeaponInfo(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race
      );

      if (!allowed.includes(weapon)) {
        return res.status(400).json({ message: 'Weapon not allowed' });
      }

      if (!proficient && granted.includes(weapon)) {
        return res.status(400).json({ message: 'Cannot remove granted proficiency' });
      }

      const update = { $set: { [`weaponProficiencies.${weapon}`]: proficient } };
      await db.collection('Characters').findOneAndUpdate(id, update, {
        returnDocument: 'after',
      });

      return res.status(200).json({ weapon, proficient });
    } catch (err) {
      next(err);
    }
  });

  router.use('/weapon-proficiency', wpRouter);
};

