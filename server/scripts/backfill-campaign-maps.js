#!/usr/bin/env node

require('dotenv').config();

const connectToDatabase = require('../db/conn');
const logger = require('../utils/logger');
const { normalizeCampaignMapState } = require('../utils/campaignMaps');

(async () => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('Campaigns');
    const cursor = collection.find({});

    let processed = 0;
    let updated = 0;

    while (await cursor.hasNext()) {
      const campaign = await cursor.next();
      processed += 1;

      const { updated: didUpdate } = await normalizeCampaignMapState({
        campaign,
        collection,
      });

      if (didUpdate) {
        updated += 1;
      }
    }

    logger.info('Campaign map backfill complete', { processed, updated });
    console.log(`Processed ${processed} campaigns; updated ${updated}.`);
    process.exit(0);
  } catch (error) {
    logger.error('Failed to backfill campaign maps', { error: error.message });
    console.error('Failed to backfill campaign maps:', error);
    process.exit(1);
  }
})();
