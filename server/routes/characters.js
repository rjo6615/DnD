const express = require('express');
const { body, validationResult } = require('express-validator');
const connectDB = require('../db/conn');
const charactersController = require('../controllers/characters');

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

const numericCharacterFields = [
  'age',
  'height',
  'weight',
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
  'startStatTotal',
  'health',
  'tempHealth',
  'appraise',
  'balance',
  'bluff',
  'climb',
  'concentration',
  'decipherScript',
  'diplomacy',
  'disableDevice',
  'disguise',
  'escapeArtist',
  'forgery',
  'gatherInfo',
  'handleAnimal',
  'heal',
  'hide',
  'intimidate',
  'jump',
  'listen',
  'moveSilently',
  'openLock',
  'ride',
  'search',
  'senseMotive',
  'sleightOfHand',
  'spot',
  'survival',
  'swim',
  'tumble',
  'useTech',
  'useRope',
];

router.get('/select', charactersController.getAllCharacters);

router.post(
  '/add',
  [
    body('token').trim().notEmpty().withMessage('token is required'),
    body('characterName').trim().notEmpty().withMessage('characterName is required'),
    body('campaign').trim().notEmpty().withMessage('campaign is required'),
    body('occupation').optional().isArray(),
    body('occupation.*.Level').isInt().toInt(),
    body('feat').optional().isArray(),
    body('weapon').optional().isArray(),
    body('armor').optional().isArray(),
    body('item').optional().isArray(),
    body('sex').optional().trim(),
    body('newSkill').optional().isArray(),
    body('diceColor').optional().trim(),
    ...numericCharacterFields.map((field) => body(field).optional().isInt().toInt()),
  ],
  handleValidationErrors,
  charactersController.addCharacter
);

router.delete('/delete/:id', charactersController.deleteCharacter);

router.get('/weapons/:campaign', charactersController.getWeapons);
router.post('/weapon/add', charactersController.addWeapon);
router.put('/update-weapon/:id', charactersController.updateWeapon);

router.get('/armor/:campaign', charactersController.getArmor);
router.post('/armor/add', charactersController.addArmor);
router.put('/update-armor/:id', charactersController.updateArmor);

router.get('/items/:campaign', charactersController.getItems);
router.post('/item/add', charactersController.addItem);
router.put('/update-item/:id', charactersController.updateItem);

router.get('/:id', charactersController.getCharacter);

module.exports = router;
