const { body, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../../middleware/auth');
const handleValidationErrors = require('../../middleware/validation');
const logger = require('../../utils/logger');

const currencyFields = ['cp', 'sp', 'gp', 'pp'];
const multipliers = {
  cp: 1,
  sp: 10,
  gp: 100,
  pp: 1000,
};

module.exports = (router) => {
  const characterRouter = express.Router();

  characterRouter.use(authenticateToken);

  characterRouter
    .route('/:id/currency')
    .put(
      currencyFields.map((field) =>
        body(field)
          .optional()
          .isInt()
          .withMessage(`${field} must be an integer`)
          .toInt()
      ),
      handleValidationErrors,
      async (req, res, next) => {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: 'Invalid ID' });
        }

        const id = { _id: ObjectId(req.params.id) };
        const db_connect = req.db;
        const deltaData = matchedData(req, { locations: ['body'], includeOptionals: true });

        const deltaCopper = currencyFields.reduce(
          (total, field) => total + (deltaData[field] || 0) * multipliers[field],
          0
        );

        try {
          const collection = db_connect.collection('Characters');
          const existing = await collection.findOne(id, {
            projection: { cp: 1, sp: 1, gp: 1, pp: 1 },
          });

          if (!existing) {
            return res.status(404).json({ message: 'Character not found' });
          }

          const currentCurrency = currencyFields.reduce((acc, field) => {
            const parsed = Number.parseInt(existing[field], 10);
            acc[field] = Number.isNaN(parsed) ? 0 : parsed;
            return acc;
          }, {});

          const existingCopper = currencyFields.reduce(
            (total, field) => total + currentCurrency[field] * multipliers[field],
            0
          );

          const finalCopper = Math.max(existingCopper + deltaCopper, 0);

          let remaining = finalCopper;
          const normalized = {};
          normalized.pp = Math.floor(remaining / multipliers.pp);
          remaining %= multipliers.pp;
          normalized.gp = Math.floor(remaining / multipliers.gp);
          remaining %= multipliers.gp;
          normalized.sp = Math.floor(remaining / multipliers.sp);
          remaining %= multipliers.sp;
          normalized.cp = remaining;

          await collection.updateOne(id, { $set: normalized });
          logger.info('Character currency updated');
          res.json(normalized);
        } catch (err) {
          next(err);
        }
      }
    );

  router.use('/characters', characterRouter);
};
