const { MongoClient } = require("mongodb");
const logger = require('../utils/logger');

const uri = process.env.ATLAS_URI;
let db;

async function connectToDatabase() {
  if (db) return db;

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  db = client.db("dnd");
  logger.info('Successfully connected to MongoDB.');

  // Ensure a unique index on the username field for the users collection
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  logger.info('Ensured unique index on users.username.');

  return db;
}

module.exports = connectToDatabase;

