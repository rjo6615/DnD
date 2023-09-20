const express = require("express"); 
const routes = express.Router(); 
const dbo = require("../db/conn"); 
const ObjectId = require("mongodb").ObjectId;

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
routes.route("/campaigns").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Campaigns")
    .find({})
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
  };
  db_connect.collection("Campaigns").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
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
 routes.route("/weapons").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Weapons")
    .find({})
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
routes.route("/armor").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Armor")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new armor.
routes.route("/armor/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
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
routes.route("/items").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection("Items")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new item.
routes.route("/item/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
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