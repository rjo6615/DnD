const express = require('express');
const classes = require('../data/classes');

module.exports = (router) => {
  const classRouter = express.Router();

  classRouter.get('/', (_req, res) => {
    res.json(classes);
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
