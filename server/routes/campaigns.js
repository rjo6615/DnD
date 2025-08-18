const express = require('express');
const { body, param, validationResult } = require('express-validator');
const connectDB = require('../db/conn');
const campaignsController = require('../controllers/campaigns');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post('/add', campaignsController.addCampaign);

router.put(
  '/players/add/:campaign',
  authenticateToken,
  [param('campaign').trim().notEmpty().withMessage('campaign is required')],
  handleValidationErrors,
  campaignsController.addPlayers
);

router.get('/dm/:DM/:campaign', campaignsController.getCampaignDM);

router.get('/dm/:DM', campaignsController.getCampaignsDM);

router.get('/player/:player', campaignsController.getCampaignsForPlayer);

router.get('/:campaign/characters', campaignsController.getCampaignCharacters);

router.get('/:campaign/:username', campaignsController.getUserCampaignCharacters);

router.get('/:campaign', campaignsController.getCampaign);

module.exports = router;
