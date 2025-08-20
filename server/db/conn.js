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
  return db;
}

module.exports = connectToDatabase;

