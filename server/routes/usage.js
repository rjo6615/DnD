const express = require('express');
const logger = require('../utils/logger');
const { getUsage } = require('../utils/cloudinary');

module.exports = (router) => {
  const usageRouter = express.Router();

  usageRouter.get('/', async (req, res) => {
    try {
      const usage = await getUsage();
      return res.json({ usage });
    } catch (error) {
      if (error && error.message === 'Cloudinary environment variables are not configured') {
        return res.status(503).json({ message: 'Cloudinary is not configured' });
      }

      logger.warn('Failed to retrieve Cloudinary usage', {
        route: 'GET /usage',
        error: error?.message,
      });

      if (error && error.message === 'Cloudinary usage API is unavailable') {
        return res.status(503).json({ message: 'Cloudinary usage API is unavailable' });
      }

      return res.status(500).json({ message: 'Failed to retrieve Cloudinary usage' });
    }
  });

  router.use('/usage', usageRouter);
};
