const express = require('express');
const { getMonsterList, getMonsterByIndex } = require('../utils/dnd5eApi');
const { normalizeMonsterDetail } = require('../utils/monsters');

module.exports = (router) => {
  const monstersRouter = express.Router();

  monstersRouter.get('/monsters', async (req, res, next) => {
    try {
      const list = await getMonsterList();
      const results = Array.isArray(list?.results) ? list.results : [];
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

      let filtered = results;
      if (search) {
        filtered = results.filter((monster) => monster?.name?.toLowerCase().includes(search));
      }

      res.json(filtered.map((monster) => ({
        index: monster.index,
        name: monster.name,
        url: monster.url,
      })));
    } catch (err) {
      next(err);
    }
  });

  monstersRouter.get('/monsters/:index', async (req, res, next) => {
    try {
      const monster = await getMonsterByIndex(req.params.index);
      const normalized = normalizeMonsterDetail(monster);
      if (!normalized) {
        return res.status(404).json({ message: 'Monster not found' });
      }
      res.json(normalized);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({ message: 'Monster not found' });
      }
      next(err);
    }
  });

  router.use(monstersRouter);
};
