const express = require('express');
const classes = require('../data/classes');
const classFeatures = require('../data/classFeatures');

module.exports = (router) => {
  const classRouter = express.Router();

  classRouter.get('/', (_req, res) => {
    res.json(classes);
  });

  classRouter.get('/:name/features/:level', (req, res) => {
    const cls = classFeatures[req.params.name.toLowerCase()];
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }
    const level = Number(req.params.level);
    const features = cls.featuresByLevel?.[level];
    const spellSlots = cls.spellSlots?.[level];
    const spellsKnown = cls.spellsKnown?.[level];
    const pactMagic = cls.pactMagic?.[level];
    if (!features && !spellSlots && spellsKnown == null && !pactMagic) {
      return res.status(404).json({ message: 'Level not found' });
    }
    res.json({ features: features || [], spellSlots, spellsKnown, pactMagic });
  });

  classRouter.get('/:name', (req, res) => {
    const cls = classes[req.params.name.toLowerCase()];
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(cls);
  });

  router.use('/classes', classRouter);
};
