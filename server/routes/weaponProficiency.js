const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const weaponData = require('../data/weapons');

// Collect allowed and granted weapons from occupation, feat, and race
function collectWeaponInfo(occupation = [], feat = [], race, customWeapons = []) {
  const allowed = new Set();
  const granted = new Set();

  const canonicalize = (name) => {
    const lower = String(name).toLowerCase();
    if (weaponData[lower]) return lower;
    if (lower.endsWith('s')) {
      const singular = lower.slice(0, -1);
      if (weaponData[singular]) return singular;
    }
    return lower;
  };

  const expandCategory = (term) => {
    const lower = String(term).toLowerCase();
    const standard = Object.keys(weaponData).filter((key) =>
      weaponData[key].category.toLowerCase().startsWith(lower)
    );
    const custom = Array.isArray(customWeapons)
      ? customWeapons
          .filter(
            (w) => w.category && w.category.toLowerCase().startsWith(lower)
          )
          .map((w) => w.name)
      : [];
    return [...standard, ...custom];
  };

  const processArray = (arr) => {
    arr.forEach((w) => {
      if (typeof w === 'string') {
        const expanded = expandCategory(w);
        if (expanded.length) {
          expanded.forEach((key) => {
            const canonical = canonicalize(key);
            allowed.add(canonical);
            granted.add(canonical);
          });
        } else {
          const canonical = canonicalize(w);
          allowed.add(canonical);
          granted.add(canonical);
        }
      } else {
        allowed.add(w);
        granted.add(w);
      }
    });
  };

  const processObject = (obj) => {
    Object.keys(obj).forEach((w) => {
      const val = obj[w];
      const expanded = expandCategory(w);
      const isGranted = val === true || (val && val.proficient);
      if (expanded.length) {
        expanded.forEach((key) => {
          const canonical = canonicalize(key);
          allowed.add(canonical);
          if (isGranted) granted.add(canonical);
        });
      } else {
        const canonical = canonicalize(w);
        allowed.add(canonical);
        if (isGranted) granted.add(canonical);
      }
    });
  };

  const processSource = (src) => {
    if (!src) return;
    const weapons = src.weapons || src.weaponProficiencies;
    if (!weapons) return;
    if (Array.isArray(weapons)) {
      processArray(weapons);
    } else if (typeof weapons === 'object') {
      processObject(weapons);
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

      const customWeapons = await db
        .collection('Weapons')
        .find({ campaign: charDoc.campaign })
        .toArray();

      const { allowed, granted } = collectWeaponInfo(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race,
        customWeapons
      );
      const proficient = Object.assign(
        Object.fromEntries(granted.map((w) => [w, true])),
        charDoc.weaponProficiencies || {}
      );

      return res.status(200).json({
        allowed,
        granted,
        proficient,
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

      const customWeapons = await db
        .collection('Weapons')
        .find({ campaign: charDoc.campaign })
        .toArray();

      const { allowed, granted } = collectWeaponInfo(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race,
        customWeapons
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

