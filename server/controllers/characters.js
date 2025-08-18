const { matchedData } = require('express-validator');
const ObjectId = require('mongodb').ObjectId;

function getCharacter(req, res) {
  const db_connect = req.db;
  const myquery = { _id: ObjectId(req.params.id) };
  db_connect
    .collection('Characters')
    .findOne(myquery, function (err, result) {
      if (err) return res.status(500).send('Server error');
      res.json(result);
    });
}

function getAllCharacters(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Characters')
    .find({})
    .toArray(function (err, result) {
      if (err) return res.status(500).send('Server error');
      res.json(result);
    });
}

function addCharacter(req, res) {
  const db_connect = req.db;
  const myobj = matchedData(req, { locations: ['body'], includeOptionals: true });
  db_connect.collection('Characters').insertOne(myobj, function (err, result) {
    if (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(result);
  });
}

function deleteCharacter(req, response) {
  const db_connect = req.db;
  const myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection('Characters').deleteOne(myquery, function (err, obj) {
    if (err) return response.status(500).send('Server error');
    response.json(obj);
  });
}

function getWeapons(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Weapons')
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) return res.status(500).send('Server error');
      res.json(result);
    });
}

function addWeapon(req, response) {
  const db_connect = req.db;
  const myobj = {
    campaign: req.body.campaign,
    weaponName: req.body.weaponName,
    enhancement: req.body.enhancement,
    damage: req.body.damage,
    critical: req.body.critical,
    weaponStyle: req.body.weaponStyle,
    range: req.body.range,
  };
  db_connect.collection('Weapons').insertOne(myobj, function (err, res) {
    if (err) return response.status(500).json({ message: 'Internal server error' });
    response.json(res);
  });
}

function updateWeapon(req, res) {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  db_connect.collection('Characters').updateOne(id, { $set: { weapon: req.body.weapon } }, (err, result) => {
    if (err) return res.status(500).send('Server error');
    res.send('user updated sucessfully');
  });
}

function getArmor(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Armor')
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) return res.status(500).send('Server error');
      res.json(result);
    });
}

function addArmor(req, response) {
  const db_connect = req.db;
  const myobj = {
    campaign: req.body.campaign,
    armorName: req.body.armorName,
    armorBonus: req.body.armorBonus,
    maxDex: req.body.maxDex,
    armorCheckPenalty: req.body.armorCheckPenalty,
  };
  db_connect.collection('Armor').insertOne(myobj, function (err, res) {
    if (err) return response.status(500).json({ message: 'Internal server error' });
    response.json(res);
  });
}

function updateArmor(req, res) {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  db_connect.collection('Characters').updateOne(id, { $set: { armor: req.body.armor } }, (err, result) => {
    if (err) return res.status(500).send('Server error');
    res.send('user updated sucessfully');
  });
}

function getItems(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('Items')
    .find({ campaign: req.params.campaign })
    .toArray(function (err, result) {
      if (err) return res.status(500).send('Server error');
      res.json(result);
    });
}

function addItem(req, response) {
  const db_connect = req.db;
  const myobj = {
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
    useRope: req.body.useRope,
  };
  db_connect.collection('Items').insertOne(myobj, function (err, res) {
    if (err) return response.status(500).json({ message: 'Internal server error' });
    response.json(res);
  });
}

function updateItem(req, res) {
  const id = { _id: ObjectId(req.params.id) };
  const db_connect = req.db;
  db_connect.collection('Characters').updateOne(id, { $set: { item: req.body.item } }, (err, result) => {
    if (err) return res.status(500).send('Server error');
    res.send('user updated sucessfully');
  });
}

module.exports = {
  getCharacter,
  getAllCharacters,
  addCharacter,
  deleteCharacter,
  getWeapons,
  addWeapon,
  updateWeapon,
  getArmor,
  addArmor,
  updateArmor,
  getItems,
  addItem,
  updateItem,
};
