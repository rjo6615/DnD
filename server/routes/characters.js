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
characterRouter.route("/characters/:id").get(function (req, res, next) {
  let db_connect = req.db;
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect
    .collection("Characters")
    .findOne(myquery, function (err, result) {
      if (err) return next(err);
      res.json(result);
    });
 });

// This section will get a list of all the characters.
characterRouter.route("/character/select").get(function (req, res, next) {
  let db_connect = req.db;
  db_connect
    .collection("Characters")
    .find({})
    .toArray(function (err, result) {
      if (err) return next(err);
      res.json(result);
    });
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
   (req, res, next) => {
    const db_connect = req.db;
    const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
    db_connect.collection('Characters').insertOne(myobj, function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
  }
);

// This section will delete a character
characterRouter.route("/delete-character/:id").delete( (req, response, next) => {
  let db_connect = req.db;
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("Characters").deleteOne(myquery, function (err, obj) {
    if (err) return next(err);
    console.log("1 character deleted");
    response.json(obj);
  });
 });

// -------------------------------------------------Campaign Section---------------------------------------------------

// --------------------------------------------Occupations Section----------------------------------------

// This section will get a list of all the occupations.
characterRouter.route("/occupations").get(function (req, res, next) {
  let db_connect = req.db;
  db_connect
    .collection("Occupations")
    .find({})
    .toArray(function (err, result) {
      if (err) return next(err);
      res.json(result);
    });
 });

// This section will update occupations.
characterRouter.route('/update-occupations/:id').put((req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;

  try {
    db_connect.collection("Characters").updateOne(id, {
      $set: { 'occupation': req.body}
    }, (err, result) => {
      if (err) { return next(err); }
      console.log("Character occupations updated");
      res.send('User updated successfully');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// ---------------------------------------------Stats Section----------------------------------------------------------

  // This section will update stats.
characterRouter.route('/update-stats/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'str': req.body.str, 
  'dex': req.body.dex, 
  'con': req.body.con,
  'int': req.body.int,
  'wis': req.body.wis,
  'cha': req.body.cha
}}, (err, result) => {
    if (err) { return next(err); }
    console.log("character stats updated");
    res.send('user updated sucessfully');
  });
});

// --------------------------------------------------Health Section--------------------------------------------------------

// This section will update tempHealth.
characterRouter.route('/update-temphealth/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'tempHealth': req.body.tempHealth
}}, (err, result) => {
    if (err) { return next(err); }
    console.log("character tempHealth updated");
    res.send('user updated sucessfully');
  });
});

// This section will update health and stats.
characterRouter.route('/update-health/:id').put((req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;

  try {

    db_connect.collection("Characters").updateOne(id, {
      $set: { 'health': req.body.health,
      'str': req.body.str,
      'dex': req.body.dex,
      'con': req.body.con,
      'int': req.body.int,
      'wis': req.body.wis,
      'cha': req.body.cha,
      'startStatTotal': req.body.startStatTotal }
    }, (err, result) => {
      if (err) { return next(err); }
      console.log("Character health and stats updated");
      res.send('User updated successfully');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// --------------------------------------------------------Level Up Section--------------------------------------------------------------------
 // This section will update level.
 characterRouter.route('/update-level/:id').put((req, res, next) => {
  const db_connect = req.db;
  const selectedOccupation = req.body.selectedOccupation;

const updateOperation = {
  $set: {
    'occupation.$.Level': req.body.level,
    'health': req.body.health
  },
};

db_connect.collection("Characters").updateOne(
  {
    _id: ObjectId(req.params.id),
    'occupation': {
      $elemMatch: {
        'Occupation': selectedOccupation,
      }
    }
  },
  updateOperation,
  (err, result) => {
    if (err) { return next(err); }
    if (result.modifiedCount === 0) {
    } else {
      console.log(`Character updated for Occupation: ${selectedOccupation}`);
      res.send('Update complete');
    }
  }
);
 }
 )
//-------------------------------------------------------------Dice Color Section------------------------------------------------------------------
 // This section will update dice color.
 characterRouter.route('/update-dice-color/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'diceColor': req.body.diceColor,
  }}, (err, result) => {
    if (err) { return next(err); }
    console.log("Dice Color updated");
    res.send('user updated sucessfully');
  });
 });
  router.use(characterRouter);
};
