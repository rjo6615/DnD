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

  // Ensure indexes used by common Campaign lookups
  await db.collection('Campaigns').createIndex({ dm: 1 });
  logger.info('Ensured index on Campaigns.dm.');

  await db.collection('Campaigns').createIndex({ players: 1 });
  logger.info('Ensured index on Campaigns.players.');

  await db.collection('Campaigns').createIndex({ campaignName: 1 });
  logger.info('Ensured index on Campaigns.campaignName.');

  await db.collection('Characters').createIndex({ campaign: 1, token: 1 }, { background: true });
  logger.info('Ensured compound index on Characters.campaign and Characters.token.');

  return db;
}

module.exports = connectToDatabase;

