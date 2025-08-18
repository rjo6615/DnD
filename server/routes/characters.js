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
characterRouter.route("/characters/:id").get(function (req, res) {
  let db_connect = req.db;
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect
    .collection("Characters")
    .findOne(myquery, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will get a list of all the characters.
characterRouter.route("/character/select").get(function (req, res) {
  let db_connect = req.db;
  db_connect
    .collection("Characters")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
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
  (req, res) => {
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
characterRouter.route("/delete-character/:id").delete((req, response) => {
  let db_connect = req.db;
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("Characters").deleteOne(myquery, function (err, obj) {
    if (err) throw err;
    console.log("1 character deleted");
    response.json(obj);
  });
 });

// -------------------------------------------------Campaign Section---------------------------------------------------

// --------------------------------------------Occupations Section----------------------------------------

// This section will get a list of all the occupations.
characterRouter.route("/occupations").get(function (req, res) {
  let db_connect = req.db;
  db_connect
    .collection("Occupations")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
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
      if (err) {
        throw err;
      }
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
    if(err) {
      throw err;
    }
    console.log("character stats updated");
    res.send('user updated sucessfully');
  });
});

// --------------------------------------------------Skills Section------------------------------------------------

// This section will update skills.
characterRouter.route('/update-skills/:id').put(async (req, res) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  try {
    const result = await db_connect.collection("Characters").findOneAndUpdate(
      id,
      {
        $set: {
          "appraise": req.body.appraise,
          "balance": req.body.balance,
          "bluff": req.body.bluff,
          "climb": req.body.climb,
          "concentration": req.body.concentration,
          "decipherScript": req.body.decipherScript,
          "diplomacy": req.body.diplomacy,
          "disableDevice": req.body.disableDevice,
          "disguise": req.body.disguise,
          "escapeArtist": req.body.escapeArtist,
          "forgery": req.body.forgery,
          "gatherInfo": req.body.gatherInfo,
          "handleAnimal": req.body.handleAnimal,
          "heal": req.body.heal,
          "hide": req.body.hide,
          "intimidate": req.body.intimidate,
          "jump": req.body.jump,
          "listen": req.body.listen,
          "moveSilently": req.body.moveSilently,
          "openLock": req.body.openLock,
          "ride": req.body.ride,
          "search": req.body.search,
          "senseMotive": req.body.senseMotive,
          "sleightOfHand": req.body.sleightOfHand,
          "spot": req.body.spot,
          "survival": req.body.survival,
          "swim": req.body.swim,
          "tumble": req.body.tumble,
          "useTech": req.body.useTech,
          "useRope": req.body.useRope,
        },
      },
      { returnDocument: 'after' }
    );
    res.status(200).json(result.value);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// This section will update added skills.
characterRouter.route('/update-add-skill/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'newSkill': req.body.newSkill
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character knowledge updated");
    res.send('user updated sucessfully');
  });
});

// This section will update ranks of skills.
characterRouter.route('/updated-add-skills/:id').put(async (req, res) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  try {
    const result = await db_connect.collection("Characters").findOneAndUpdate(
      id,
      { $set: { 'newSkill': req.body.newSkill } },
      { returnDocument: 'after' }
    );
    res.status(200).json(result.value);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// --------------------------------------------------Health Section--------------------------------------------------------

// This section will update tempHealth.
characterRouter.route('/update-temphealth/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'tempHealth': req.body.tempHealth
}}, (err, result) => {
    if(err) {
      throw err;
    }
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
      if (err) {
        throw err;
      }
      console.log("Character health and stats updated");
      res.send('User updated successfully');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// ----------------------------------------------------Weapon Section----------------------------------------------------

 // This section will get a list of all the weapons.
 characterRouter.route("/weapons/:campaign").get(function (req, res) {
  let db_connect = req.db;
  db_connect
    .collection("Weapons")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will update weapons.
characterRouter.route('/update-weapon/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'weapon': req.body.weapon
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character weapon updated");
    res.send('user updated sucessfully');
  });
});

// This section will create a new weapon.
characterRouter.route("/weapon/add").post(function (req, response) {
  let db_connect = req.db;
  let myobj = {
  campaign: req.body.campaign,
  weaponName: req.body.weaponName,
  enhancement: req.body.enhancement,
  damage: req.body.damage,
  critical: req.body.critical,
  weaponStyle: req.body.weaponStyle,
  range: req.body.range
  };
  db_connect.collection("Weapons").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });
// -----------------------------------------------------Armor Section--------------------------------------------------------

// This section will get a list of all the armor.
characterRouter.route("/armor/:campaign").get(function (req, res) {
  let db_connect = req.db;
  db_connect
    .collection("Armor")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new armor.
characterRouter.route("/armor/add").post(function (req, response) {
  let db_connect = req.db;
  let myobj = {
  campaign: req.body.campaign,
  armorName: req.body.armorName,
  armorBonus: req.body.armorBonus,
  maxDex: req.body.maxDex,
  armorCheckPenalty: req.body.armorCheckPenalty
  };
  db_connect.collection("Armor").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

// This section will update armors.
characterRouter.route('/update-armor/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'armor': req.body.armor
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character armor updated");
    res.send('user updated sucessfully');
  });
});
// ------------------------------------------------------Item Section-----------------------------------------------------------

// This section will get a list of all the items.
characterRouter.route("/items/:campaign").get(function (req, res) {
  let db_connect = req.db;
  db_connect
    .collection("Items")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new item.
characterRouter.route("/item/add").post(function (req, response) {
  let db_connect = req.db;
  let myobj = {
    campaign: req.body.campaign,
    itemName: req.body.itemName, 
    notes: req.body.notes,
    str: req.body.str,
    dex: req.body.dex,
    con: req.body.con,
    int: req.body.int,
    wis: req.body.wis,
    cha: req.body.cha,
    appraise: req.body.appraise,
    balance: req.body.balance,
    bluff: req.body.bluff,
    climb: req.body.climb,
    concentration: req.body.concentration,
    decipherScript: req.body.decipherScript,
    diplomacy: req.body.diplomacy,
    disableDevice: req.body.disableDevice,
    disguise: req.body.disguise,
    escapeArtist: req.body.escapeArtist,
    forgery: req.body.forgery,
    gatherInfo: req.body.gatherInfo,
    handleAnimal: req.body.handleAnimal,
    heal: req.body.heal,
    hide: req.body.hide,
    intimidate: req.body.intimidate,
    jump: req.body.jump,
    listen: req.body.listen,
    moveSilently: req.body.moveSilently,
    openLock: req.body.openLock,
    ride: req.body.ride,
    search: req.body.search,
    senseMotive: req.body.senseMotive,
    sleightOfHand: req.body.sleightOfHand,
    spot: req.body.spot,
    survival: req.body.survival,
    swim: req.body.swim,
    tumble: req.body.tumble,
    useTech: req.body.useTech,
    useRope: req.body.useRope
  };
  db_connect.collection("Items").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

 // This section will update items.
characterRouter.route('/update-item/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'item': req.body.item
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character item updated");
    res.send('user updated sucessfully');
  });
});

// ------------------------------------------------------Feat Section-----------------------------------------------------------

// This section will get a list of all the feats.
characterRouter.route("/feats").get(function (req, res) {
  let db_connect = req.db;
  db_connect
    .collection("Feats")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new feat.
characterRouter.route("/feat/add").post(function (req, response) {
  let db_connect = req.db;
  let myobj = {
    featName: req.body.featName, 
    notes: req.body.notes,
    appraise: req.body.appraise,
    balance: req.body.balance,
    bluff: req.body.bluff,
    climb: req.body.climb,
    concentration: req.body.concentration,
    decipherScript: req.body.decipherScript,
    diplomacy: req.body.diplomacy,
    disableDevice: req.body.disableDevice,
    disguise: req.body.disguise,
    escapeArtist: req.body.escapeArtist,
    forgery: req.body.forgery,
    gatherInfo: req.body.gatherInfo,
    handleAnimal: req.body.handleAnimal,
    heal: req.body.heal,
    hide: req.body.hide,
    intimidate: req.body.intimidate,
    jump: req.body.jump,
    listen: req.body.listen,
    moveSilently: req.body.moveSilently,
    openLock: req.body.openLock,
    ride: req.body.ride,
    search: req.body.search,
    senseMotive: req.body.senseMotive,
    sleightOfHand: req.body.sleightOfHand,
    spot: req.body.spot,
    survival: req.body.survival,
    swim: req.body.swim,
    tumble: req.body.tumble,
    useTech: req.body.useTech,
    useRope: req.body.useRope
  };
  db_connect.collection("Feats").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

 // This section will update feats.
characterRouter.route('/update-feat/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = req.db;
  db_connect.collection("Characters").updateOne(id, {$set:{
  'feat': req.body.feat
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character feat updated");
    res.send('user updated sucessfully');
  });
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
    if (err) {
      throw err;
    }
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
    if(err) {
      throw err;
    }
    console.log("Dice Color updated");
    res.send('user updated sucessfully');
  });
 });
  router.use(characterRouter);
};
