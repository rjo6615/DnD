const https = require('https');
const logger = require('./logger');

const API_BASE = 'https://www.dnd5eapi.co';

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    if (!path || typeof path !== 'string') {
      reject(new Error('A valid path is required to fetch data from the 5e SRD API.'));
      return;
    }

    const request = https.get(`${API_BASE}${path}`, (response) => {
      const { statusCode } = response;

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        const error = new Error(`Request to 5e SRD API failed with status code ${statusCode}`);
        error.statusCode = statusCode;
        reject(error);
        return;
      }

      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    request.on('error', (err) => {
      logger.error('Error fetching data from 5e SRD API', { error: err.message });
      reject(err);
    });
  });
}

let monsterListCache = null;
const monsterDetailCache = new Map();

async function getMonsterList() {
  if (monsterListCache) {
    return monsterListCache;
  }

  monsterListCache = await fetchJson('/api/monsters');
  return monsterListCache;
}

async function getMonsterByIndex(index) {
  if (!index || typeof index !== 'string') {
    const error = new Error('Monster index is required');
    error.statusCode = 400;
    throw error;
  }

  const normalized = index.trim().toLowerCase();
  if (!normalized) {
    const error = new Error('Monster index is required');
    error.statusCode = 400;
    throw error;
  }

  if (monsterDetailCache.has(normalized)) {
    return monsterDetailCache.get(normalized);
  }

  const monster = await fetchJson(`/api/monsters/${encodeURIComponent(normalized)}`);
  monsterDetailCache.set(normalized, monster);
  return monster;
}

function clearMonsterCache() {
  monsterListCache = null;
  monsterDetailCache.clear();
}

module.exports = {
  getMonsterList,
  getMonsterByIndex,
  clearMonsterCache,
};
