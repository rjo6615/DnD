const express = require("express"); 
const routes = express.Router(); 
const dbo = require("../db/conn"); 
const ObjectId = require("mongodb").ObjectId;

// This section will get a single character
routes.route("/characters").get(function (req, res) {
    let db_connect = dbo.getDb();
    let myquery = { characterName: "Timmy" };
    db_connect
      .collection("Characters")
      .findOne(myquery, function (err, result) {
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

// This section will get a workouts.
// routes.route("/routines/goal/:goal/:difficulty/:day").get(function (req, res) {
//   let db_connect = dbo.getDb();
//   db_connect
//     .collection(req.params.goal)
//     .find({ difficulty: req.params.difficulty, day: req.params.day })
//     .toArray(function (err, result) {
//       if (err) throw err;
//       res.json(result);
//     });
//  });

// This section will create a new character.
routes.route("/character/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
  characterName: req.body.characterName,
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
  };
  db_connect.collection("Characters").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

 // This section will update routine.
routes.route('/update/:id').put((req, res, next) => {
  let id = { _id: ObjectId(req.params.id) };
  let db_connect = dbo.getDb();
  db_connect.collection("routines").updateOne(id, {$set:{
  'routineName': req.body.routineName, 
  'age': req.body.age, 
  'sex': req.body.sex,
  'height': req.body.height,
  'currentWeight': req.body.currentWeight,
  'targetWeight': req.body.targetWeight,
  'goal': req.body.goal,
  'workoutDifficulty': req.body.workoutDifficulty,
  'calorieIntake': req.body.calorieIntake,
  'calorieMaintain': req.body.calorieMaintain,
  'daysToTarget': req.body.daysToTarget}}, (err, result) => {
    if(err) {
      throw err;
    }
    console.log("1 routine updated");
    res.send('user updated sucessfully');
  });
});

 // This section will delete a routine
routes.route("/delete-routine/:id").delete((req, response) => {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("routines").deleteOne(myquery, function (err, obj) {
    if (err) throw err;
    console.log("1 routine deleted");
    response.json(obj);
  });
 });
  

   module.exports = routes;