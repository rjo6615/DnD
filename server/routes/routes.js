const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const routes = express.Router();
const dbo = require('../db/conn');
require('dotenv').config();
const ObjectId = require("mongodb").ObjectId;

const jwtSecretKey = process.env.JWT_SECRET;

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, jwtSecretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};


// Login route
routes.post('/login', (req, res) => {
  const { username, password } = req.body;

  let db_connect = dbo.getDb();
  let myquery = { username: username };

  db_connect
    .collection('users')
    .findOne(myquery, function (err, user) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Internal server error' });
        }
        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ username: user.username }, jwtSecretKey, { expiresIn: '1h' });
        res.json({ token });
        const decoded = jwt.verify(token, jwtSecretKey);
        console.log(decoded);
      });
    });
});

// Verify user credentials
routes.post('/users/verify', (req, res) => {
  const { username, password } = req.body;

  let db_connect = dbo.getDb();
  let myquery = { username: username };

  db_connect
    .collection('users')
    .findOne(myquery, function (err, user) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Internal server error' });
        }
        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }

        res.json({ valid: true });
      });
    });
});

// Get all users (protected route)
routes.get('/users', authenticateToken, (req, res) => {
  let db_connect = dbo.getDb();
  db_connect
    .collection('users')
    .find({})
    .toArray(function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
});

// Get user by username (protected route)
// Clients must include a valid JWT in the Authorization header: "Bearer <token>"
routes.get('/users/:username', authenticateToken, (req, res) => {
  let db_connect = dbo.getDb();
  let myquery = { username: req.params.username };
  db_connect
    .collection('users')
    .findOne(myquery, function (err, user) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    });
});

// Create a new user route
routes.post('/users/add', (req, res) => {
  const { username, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }

    let db_connect = dbo.getDb();
    let myobj = {
      username: username,
      password: hashedPassword,
    };

    db_connect.collection('users').insertOne(myobj, function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
  });
});


// Add players to a campaign (protected route)
routes.route('/players/add/:campaign').put(authenticateToken, (req, res) => {
  const campaignName = req.params.campaign;
  const newPlayers = req.body; // Assuming newPlayers is an array of players

  const db_connect = dbo.getDb();
  db_connect.collection("Campaigns").updateOne(
    { campaignName: campaignName },
    { $addToSet: { 'players': { $each: newPlayers } } }, // Add new players to existing array only if they are not already present
    (err, result) => {
      if(err) {
        console.error("Error adding players:", err);
        return res.status(500).send("Internal Server Error");
      }
      console.log("Players added");
      if (result.modifiedCount === 0) {
        // If no modifications were made, it means the players were not added because they already exist
        return res.status(400).send("Players already exist in the array");
      }
      res.send('Players added successfully');
    }
  );
});


// -------------------------------------------------Character Section-----------------------------------------------

// This section will get a single character by id
routes.route("/characters/:id").get(function (req, res) {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect
    .collection("Characters")
    .findOne(myquery, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will get a list of all the characters.
routes.route("/character/select").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Characters")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new character.
routes.route("/character/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
  token: req.body.token,
  characterName: req.body.characterName,
  campaign: req.body.campaign,
  occupation: req.body.occupation,
  feat: req.body.feat,
  weapon: req.body.weapon,
  armor: req.body.armor,
  item: req.body.item,
  age: req.body.age,
  sex: req.body.sex,
  height: req.body.height,
  weight: req.body.weight,
  str: req.body.str,
  dex: req.body.dex,
  con: req.body.con,
  int: req.body.int,
  wis: req.body.wis,
  cha: req.body.cha,
  startStatTotal: req.body.startStatTotal,
  health: req.body.health,
  tempHealth: req.body.tempHealth,
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
  useRope: req.body.useRope,
  newSkill: req.body.newSkill,
  diceColor: req.body.diceColor,
  };
  db_connect.collection("Characters").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

// This section will delete a character
routes.route("/delete-character/:id").delete((req, response) => {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("Characters").deleteOne(myquery, function (err, obj) {
    if (err) throw err;
    console.log("1 character deleted");
    response.json(obj);
  });
 });

// -------------------------------------------------Campaign Section---------------------------------------------------

// This section will find all of the users characters in a specific campaign.
routes.route("/campaign/:campaign/:username").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Characters")
    .find({ campaign: req.params.campaign, token: req.params.username })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

 // This section will find all characters in a specific campaign.
routes.route("/campaign/:campaign").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Characters")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will get a list of all the campaigns.
routes.route("/campaigns/:player").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Campaigns")
    .find({ players: { $in: [req.params.player] } }) // Using $in to search for the player in the players array
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

 // This section will create a new campaign.
routes.route("/campaign/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
  campaignName: req.body.campaignName,
  gameMode: req.body.gameMode,
  dm: req.body.dm,
  players: req.body.players,
  };
  db_connect.collection("Campaigns").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });


 // This section will be for the DM 
 routes.route("/campaignsDM/:DM").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Campaigns")
    .find({ dm: req.params.DM })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

 routes.route("/campaignsDM/:DM/:campaign").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Campaigns")
    .findOne({ dm: req.params.DM, campaignName: req.params.campaign }, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });
// --------------------------------------------Occupations Section----------------------------------------

// This section will get a list of all the occupations.
routes.route("/occupations").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Occupations")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will update occupations.
routes.route('/update-occupations/:id').put((req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = dbo.getDb();

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
routes.route('/update-stats/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
routes.route('/update-skills/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
  db_connect.collection("Characters").updateOne(id, {$set:{
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
  "useRope": req.body.useRope
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character skills updated");
    res.send('user updated sucessfully');
  });
});

// This section will update added skills.
routes.route('/update-add-skill/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
routes.route('/updated-add-skills/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
  db_connect.collection("Characters").updateOne(id, {$set:{
  'newSkill': req.body.newSkill
}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("character add skills updated");
    res.send('user updated sucessfully');
  });
});

// --------------------------------------------------Health Section--------------------------------------------------------

// This section will update tempHealth.
routes.route('/update-temphealth/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
routes.route('/update-health/:id').put((req, res, next) => {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = dbo.getDb();

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
 routes.route("/weapons/:campaign").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Weapons")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will update weapons.
routes.route('/update-weapon/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
routes.route("/weapon/add").post(function (req, response) {
  let db_connect = dbo.getDb();
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
routes.route("/armor/:campaign").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Armor")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new armor.
routes.route("/armor/add").post(function (req, response) {
  let db_connect = dbo.getDb();
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
routes.route('/update-armor/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
routes.route("/items/:campaign").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Items")
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new item.
routes.route("/item/add").post(function (req, response) {
  let db_connect = dbo.getDb();
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
routes.route('/update-item/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
routes.route("/feats").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Feats")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new feat.
routes.route("/feat/add").post(function (req, response) {
  let db_connect = dbo.getDb();
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
routes.route('/update-feat/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
 routes.route('/update-level/:id').put((req, res, next) => {
  const db_connect = dbo.getDb();
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
 routes.route('/update-dice-color/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
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
   module.exports = routes;