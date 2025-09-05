const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const { armors: armorData } = require('../data/armor');

// Collect allowed and granted armor from occupation, feat, and race
function collectArmorInfo(occupation = [], feat = [], race, customArmors = []) {
  const allowed = new Set();
  const granted = new Set();

  const canonicalize = (name) => {
    const lower = String(name).toLowerCase();
    if (armorData[lower]) return lower;
    if (lower.endsWith('s')) {
      const singular = lower.slice(0, -1);
      if (armorData[singular]) return singular;
    }
    return lower;
  };

  const typeMap = Array.isArray(customArmors)
    ? customArmors.reduce((acc, a) => {
        const type = String(a.type || a.name).toLowerCase();
        const nameKey = canonicalize(a.name);
        (acc[type] ||= []).push(nameKey);
        return acc;
      }, {})
    : {};

  const addArmor = (canonical, isGranted = true) => {
    allowed.add(canonical);
    if (isGranted) granted.add(canonical);
    const extra = typeMap[canonical];
    if (extra) {
      extra.forEach((name) => {
        allowed.add(name);
        if (isGranted) granted.add(name);
      });
    }
  };

  const expandCategory = (term) => {
    const lower = String(term).toLowerCase();
    const standard = Object.keys(armorData).filter((key) =>
      armorData[key].category.toLowerCase().startsWith(lower)
    );
    const custom = Array.isArray(customArmors)
      ? customArmors
          .filter(
            (a) => a.category && a.category.toLowerCase().startsWith(lower)
          )
          .map((a) => a.name)
      : [];
    return [...standard, ...custom];
  };

  const processArray = (arr) => {
    arr.forEach((a) => {
      if (typeof a === 'string') {
        const expanded = expandCategory(a);
        if (expanded.length) {
          expanded.forEach((key) => {
            const canonical = canonicalize(key);
            addArmor(canonical);
          });
        } else {
          const canonical = canonicalize(a);
          addArmor(canonical);
        }
      } else {
        addArmor(a);
      }
    });
  };

  const processObject = (obj) => {
    Object.keys(obj).forEach((a) => {
      const val = obj[a];
      const expanded = expandCategory(a);
      const isGranted = val === true || (val && val.proficient);
      if (expanded.length) {
        expanded.forEach((key) => {
          const canonical = canonicalize(key);
          addArmor(canonical, isGranted);
        });
      } else {
        const canonical = canonicalize(a);
        addArmor(canonical, isGranted);
      }
    });
  };

  const processSource = (src) => {
    if (!src) return;
    const armor = src.armor || src.armorProficiencies;
    if (!armor) return;
    if (Array.isArray(armor)) {
      processArray(armor);
    } else if (typeof armor === 'object') {
      processObject(armor);
    }
  };

  if (Array.isArray(occupation)) occupation.forEach(processSource);
  if (Array.isArray(feat)) feat.forEach(processSource);
  processSource(race);

  return { allowed: Array.from(allowed), granted: Array.from(granted) };
}

module.exports = (router) => {
  const apRouter = express.Router();

  // authentication for all armor proficiency routes
  apRouter.use(authenticateToken);

  // Get allowed and proficient armor for a character
  apRouter.get('/:id', async (req, res, next) => {
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

      const customArmors = await db
        .collection('Armor')
        .find({ campaign: charDoc.campaign })
        .toArray();

      const { allowed, granted } = collectArmorInfo(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race,
        customArmors
      );
      const proficient = Object.assign(
        Object.fromEntries(granted.map((a) => [a, true])),
        charDoc.armorProficiencies || {}
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

  // Toggle armor proficiency
  apRouter.put('/:id', async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const { armor, proficient = false } = req.body || {};
    if (typeof armor !== 'string' || !armor.trim()) {
      return res.status(400).json({ message: 'Invalid armor' });
    }

    const db = req.db;
    const id = { _id: ObjectId(req.params.id) };

    try {
      const charDoc = await db.collection('Characters').findOne(id);
      if (!charDoc) {
        return res.status(404).json({ message: 'Character not found' });
      }

      const customArmors = await db
        .collection('Armor')
        .find({ campaign: charDoc.campaign })
        .toArray();

      const { allowed, granted } = collectArmorInfo(
        charDoc.occupation,
        charDoc.feat,
        charDoc.race,
        customArmors
      );

      if (!allowed.includes(armor)) {
        return res.status(400).json({ message: 'Armor not allowed' });
      }

      if (!proficient && granted.includes(armor)) {
        return res
          .status(400)
          .json({ message: 'Cannot remove granted proficiency' });
      }

      const update = { $set: { [`armorProficiencies.${armor}`]: proficient } };
      await db.collection('Characters').findOneAndUpdate(id, update, {
        returnDocument: 'after',
      });

      return res.status(200).json({ armor, proficient });
    } catch (err) {
      next(err);
    }
  });

  router.use('/armor-proficiency', apRouter);
};

