const logger = require('../utils/logger');
const { fetchUsage } = require('../utils/cloudinary');

module.exports = (router) => {
  router.get('/usage', async (req, res) => {
    try {
      const usage = await fetchUsage();

      logger.info('Fetched Cloudinary usage data', {
        source: 'cloudinaryUsageRoute',
        usage,
      });

      res.json({ usage });
    } catch (error) {
      logger.warn('Failed to fetch Cloudinary usage data', {
        source: 'cloudinaryUsageRoute',
        error: error.message,
      });

      res.status(500).json({ message: 'Failed to retrieve Cloudinary usage' });
    }
  });
};
