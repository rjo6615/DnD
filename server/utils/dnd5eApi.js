const https = require('https');
const logger = require('./logger');
const localMonsterData = require('../data/monsters.json');

const API_BASE = 'https://www.dnd5eapi.co';

const localMonsterList =
  localMonsterData && Array.isArray(localMonsterData.results)
    ? localMonsterData.results.map((monster) => ({
        index: monster.index,
        name: monster.name,
        url: monster.url,
      }))
    : [];

const localMonsterMap = new Map();
if (localMonsterData && localMonsterData.monsters && typeof localMonsterData.monsters === 'object') {
  Object.entries(localMonsterData.monsters).forEach(([index, monster]) => {
    if (!monster || typeof monster !== 'object') {
      return;
    }

    const normalizedIndex = typeof index === 'string' ? index.trim().toLowerCase() : '';
    if (!normalizedIndex) {
      return;
    }

    localMonsterMap.set(normalizedIndex, {
      ...monster,
      index: monster.index || normalizedIndex,
    });
  });
}

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

let monsterListCache = localMonsterList.length
  ? { count: localMonsterList.length, results: localMonsterList }
  : null;
const monsterDetailCache = new Map(localMonsterMap);

async function getMonsterList() {
  if (monsterListCache) {
    return monsterListCache;
  }

  try {
    monsterListCache = await fetchJson('/api/monsters');
  } catch (err) {
    if (localMonsterList.length) {
      logger.warn('Falling back to bundled 5e SRD monster list', { error: err.message });
      monsterListCache = { count: localMonsterList.length, results: localMonsterList };
    } else {
      throw err;
    }
  }

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

  try {
    const monster = await fetchJson(`/api/monsters/${encodeURIComponent(normalized)}`);
    monsterDetailCache.set(normalized, monster);
    return monster;
  } catch (err) {
    if (localMonsterMap.has(normalized)) {
      logger.warn('Falling back to bundled 5e SRD monster detail', {
        error: err.message,
        monster: normalized,
      });
      const monster = localMonsterMap.get(normalized);
      monsterDetailCache.set(normalized, monster);
      return monster;
    }
    throw err;
  }
}

function clearMonsterCache() {
  monsterListCache = localMonsterList.length
    ? { count: localMonsterList.length, results: localMonsterList }
    : null;
  monsterDetailCache.clear();
  localMonsterMap.forEach((monster, index) => {
    monsterDetailCache.set(index, monster);
  });
}

module.exports = {
  getMonsterList,
  getMonsterByIndex,
  clearMonsterCache,
};
