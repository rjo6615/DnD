const express = require("express"); 
const routes = express.Router(); 
const dbo = require("../db/conn"); 
const ObjectId = require("mongodb").ObjectId;

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

// This section will create a new character.
routes.route("/character/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
  characterName: req.body.characterName,
  campaign: req.body.campaign,
  level: req.body.level, 
  occupation: req.body.occupation,
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
  };
  db_connect.collection("Characters").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
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
  

   module.exports = routes;