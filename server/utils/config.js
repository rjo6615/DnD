const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from config.env located one directory up
dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const requiredEnv = ['JWT_SECRET', 'ATLAS_URI', 'CLIENT_ORIGIN'];

const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  atlasUri: process.env.ATLAS_URI,
  clientOrigin: process.env.CLIENT_ORIGIN,
};
