const express = require("express"); 
const routineRoutes = express.Router(); 
const dbo = require("../db/conn"); 
const ObjectId = require("mongodb").ObjectId;

// This section will get a user
routineRoutes.route("/users/:username/:password").get(function (req, res) {
  let db_connect = dbo.getDb();
  let myquery = { username: req.params.username, password: req.params.password };
  db_connect
    .collection("users")
    .findOne(myquery, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

 // This section will create a new user
 routineRoutes.route("/users/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
    username: req.body.username,
    password: req.body.password,
  };
  db_connect.collection("users").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

// This section will get a single routine by id
routineRoutes.route("/routines/:id").get(function (req, res) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId(req.params.id) };
    db_connect
      .collection("routines")
      .findOne(myquery, function (err, result) {
        if (err) throw err;
        res.json(result);
      });
   });

// This section will get a list of all the routines.
routineRoutes.route("/routines").get(function (req, res) {
    let db_connect = dbo.getDb();
    db_connect
      .collection("routines")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        res.json(result);
      });
   });

// This section will get a workouts.
routineRoutes.route("/routines/goal/:goal/:difficulty/:day").get(function (req, res) {
  let db_connect = dbo.getDb();
  db_connect
    .collection(req.params.goal)
    .find({ difficulty: req.params.difficulty, day: req.params.day })
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
 });

// This section will create a new routine.
routineRoutes.route("/routines/add").post(function (req, response) {
  let db_connect = dbo.getDb();
  let myobj = {
    routineName: req.body.routineName,
    age: req.body.age,
    sex: req.body.sex,
    height: req.body.height,
    currentWeight: req.body.currentWeight,
    targetWeight: req.body.targetWeight,
    goal: req.body.goal,
    workoutDifficulty: req.body.workoutDifficulty,
    calorieIntake: req.body.calorieIntake,
    calorieMaintain: req.body.calorieMaintain,
    daysToTarget: req.body.daysToTarget,
  };
  db_connect.collection("routines").insertOne(myobj, function (err, res) {
    if (err) throw err;
    response.json(res);
  });
 });

 // This section will update routine.
routineRoutes.route('/update/:id').put((req, res, next) => {
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
routineRoutes.route("/delete-routine/:id").delete((req, response) => {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("routines").deleteOne(myquery, function (err, obj) {
    if (err) throw err;
    console.log("1 routine deleted");
    response.json(obj);
  });
 });
  

   module.exports = routineRoutes;