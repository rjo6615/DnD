const { body, param, matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

module.exports = (router) => {
  const characterRouter = express.Router();

  // Apply authentication to all character routes
  characterRouter.use(authenticateToken);

// -------------------------------------------------Character Section-----------------------------------------------

// This section will get a single character by id
characterRouter.route("/characters/:id").get(async (req, res, next) => {
  try {
    const db_connect = req.db;
    const myquery = { _id: ObjectId(req.params.id) };
    const result = await db_connect
      .collection("Characters")
      .findOne(myquery);
    res.json(result);
  } catch (err) {
    next(err);
  }
 });

// This section will get a list of all the characters.
characterRouter.route("/character/select").get(async (req, res, next) => {
  try {
    const db_connect = req.db;
    const result = await db_connect
      .collection("Characters")
      .find({})
      .toArray();
    res.json(result);
  } catch (err) {
    next(err);
  }
 });

// This section will create a new character.
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

characterRouter.post(
  '/character/add',
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
  async (req, res) => {
    const db_connect = req.db;
    const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
    try {
      const result = await db_connect.collection('Characters').insertOne(myobj);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// This section will delete a character
characterRouter.route("/delete-character/:id").delete( async (req, response, next) => {
  const db_connect = req.db;
  const myquery = { _id: ObjectId(req.params.id) };
  try {
    const obj = await db_connect.collection("Characters").deleteOne(myquery);
    console.log("1 character deleted");
    response.json(obj);
  } catch (err) {
    next(err);
  }
 });

// -------------------------------------------------Campaign Section---------------------------------------------------

// --------------------------------------------Occupations Section----------------------------------------

// This section will get a list of all the occupations.
characterRouter.route("/occupations").get(async (req, res, next) => {
  try {
    const db_connect = req.db;
    const result = await db_connect
      .collection("Occupations")
      .find({})
      .toArray();
    res.json(result);
  } catch (err) {
    next(err);
  }
 });

// This section will update occupations.
characterRouter.route('/update-occupations/:id').put(async (req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;

  try {
    await db_connect.collection("Characters").updateOne(id, {
      $set: { 'occupation': req.body }
    });
    console.log("Character occupations updated");
    res.send('User updated successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// ---------------------------------------------Stats Section----------------------------------------------------------

  // This section will update stats.
characterRouter.route('/update-stats/:id').put(async (req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  try {
    await db_connect.collection("Characters").updateOne(id, {
      $set: {
        'str': req.body.str,
        'dex': req.body.dex,
        'con': req.body.con,
        'int': req.body.int,
        'wis': req.body.wis,
        'cha': req.body.cha
      }
    });
    console.log("character stats updated");
    res.send('user updated sucessfully');
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------Health Section--------------------------------------------------------

// This section will update tempHealth.
characterRouter.route('/update-temphealth/:id').put(async (req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  try {
    await db_connect.collection("Characters").updateOne(id, {
      $set: { 'tempHealth': req.body.tempHealth }
    });
    console.log("character tempHealth updated");
    res.send('user updated sucessfully');
  } catch (err) {
    next(err);
  }
});

// This section will update health and stats.
characterRouter.route('/update-health/:id').put(async (req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;

  try {
    await db_connect.collection("Characters").updateOne(id, {
      $set: {
        'health': req.body.health,
        'str': req.body.str,
        'dex': req.body.dex,
        'con': req.body.con,
        'int': req.body.int,
        'wis': req.body.wis,
        'cha': req.body.cha,
        'startStatTotal': req.body.startStatTotal
      }
    });
    console.log("Character health and stats updated");
    res.send('User updated successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// --------------------------------------------------------Level Up Section--------------------------------------------------------------------
 // This section will update level.
 characterRouter.route('/update-level/:id').put(async (req, res, next) => {
  const db_connect = req.db;
  const selectedOccupation = req.body.selectedOccupation;

  const updateOperation = {
    $set: {
      'occupation.$.Level': req.body.level,
      'health': req.body.health
    },
  };

  try {
    const result = await db_connect.collection("Characters").updateOne(
      {
        _id: ObjectId(req.params.id),
        'occupation': {
          $elemMatch: {
            'Occupation': selectedOccupation,
          }
        }
      },
      updateOperation
    );
    if (result.modifiedCount !== 0) {
      console.log(`Character updated for Occupation: ${selectedOccupation}`);
      res.send('Update complete');
    }
  } catch (err) {
    next(err);
  }
 });
//-------------------------------------------------------------Dice Color Section------------------------------------------------------------------
 // This section will update dice color.
 characterRouter.route('/update-dice-color/:id').put(async (req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  try {
    await db_connect.collection("Characters").updateOne(id, {
      $set: { 'diceColor': req.body.diceColor }
    });
    console.log("Dice Color updated");
    res.send('user updated sucessfully');
  } catch (err) {
    next(err);
  }
 });
  router.use(characterRouter);
};
