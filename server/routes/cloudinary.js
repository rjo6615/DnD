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
      const statusCode =
        Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600
          ? error.statusCode
          : 500;

      const reason =
        error?.details?.reason && typeof error.details.reason === 'string'
          ? error.details.reason
          : null;

      logger.warn('Failed to fetch Cloudinary usage data', {
        source: 'cloudinaryUsageRoute',
        error: error.message,
        statusCode,
        reason,
      });

      const payload = { message: 'Failed to retrieve Cloudinary usage' };
      if (reason) {
        payload.reason = reason;
      }

      res.status(statusCode).json(payload);
    }
  });
};
