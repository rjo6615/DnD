const { param, body, query } = require('express-validator');
const express = require('express');
const { randomUUID } = require('crypto');
const { ObjectId } = require('mongodb');
const { getMonsterByIndex } = require('../utils/dnd5eApi');
const { buildEnemyRecord } = require('../utils/monsters');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const logger = require('../utils/logger');
const { emitCombatUpdate, emitEnemiesUpdate, emitMapUpdate } = require('../utils/socket');
const {
  normalizeCampaignMapState,
  prepareStoredMap,
  buildCampaignMapPayload,
  normalizeMapTokens,
  normalizeTokenRotation,
  normalizeTokenSize,
} = require('../utils/campaignMaps');
const {
  uploadMapImage,
  deleteMapImage,
  listTokenAssets,
  getTokenRootFolder,
  listTokenFolderTree,
  suggestEnemyFigurine,
} = require('../utils/cloudinary');


const resetActiveDeathSaveRoll = async (db, combatState) => {
  const activeTurn = Number.isInteger(combatState?.activeTurn) ? combatState.activeTurn : null;
  const participants = Array.isArray(combatState?.participants) ? combatState.participants : [];
  if (activeTurn === null || activeTurn < 0 || activeTurn >= participants.length) return;
  const characterId = typeof participants[activeTurn]?.characterId === 'string' ? participants[activeTurn].characterId.trim() : '';
  if (!characterId) return;
  const filters = [{ characterId }];
  if (ObjectId.isValid(characterId)) filters.push({ _id: new ObjectId(characterId) });
  await db.collection('Characters').updateOne(
    { $or: filters, 'deathState.isDying': true, 'deathState.isDead': { $ne: true } },
    { $set: { 'deathState.rolledThisTurn': false, 'deathState.updatedAt': new Date().toISOString() } }
  );
};

const deriveCloudinaryPublicIdFromUrl = (url) => {
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch (error) {
    return null;
  }

  if (!parsed.hostname || !parsed.hostname.includes('cloudinary.com')) {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch (error) {
      return segment;
    }
  });

  if (segments.length === 0) {
    return null;
  }

  const uploadIndex = segments.findIndex((segment) => segment === 'upload');
  if (uploadIndex === -1) {
    return null;
  }

  let remainder = segments.slice(uploadIndex + 1);

  const versionIndex = remainder.findIndex((segment) => /^v\d+$/.test(segment));
  if (versionIndex !== -1) {
    remainder = remainder.slice(versionIndex + 1);
  }

  while (remainder.length > 0 && /[,=]/.test(remainder[0])) {
    remainder = remainder.slice(1);
  }

  if (remainder.length === 0) {
    return null;
  }

  const lastIndex = remainder.length - 1;
  remainder[lastIndex] = remainder[lastIndex].replace(/\.[^.]+$/, '');

  const publicId = remainder.join('/').trim();
  return publicId || null;
};

const isCloudinaryUrl = (url) => {
  const publicId = deriveCloudinaryPublicIdFromUrl(url);
  return typeof publicId === 'string' && publicId.trim() !== '';
};

const prepareMapAssetsForStorage = async (mapInput) => {
  if (!mapInput || typeof mapInput !== 'object') {
    return mapInput;
  }

  const prepared = { ...mapInput };

  const rawBase64 =
    typeof prepared.imageBase64 === 'string' ? prepared.imageBase64.trim() : '';
  const rawType =
    typeof prepared.imageType === 'string' ? prepared.imageType.trim() : '';
  const rawUrl =
    typeof prepared.imageUrl === 'string' ? prepared.imageUrl.trim() : '';

  const hasCloudinaryUrl = rawUrl ? isCloudinaryUrl(rawUrl) : false;
  if (hasCloudinaryUrl && !prepared.cloudinaryPublicId) {
    const derivedId = deriveCloudinaryPublicIdFromUrl(rawUrl);
    if (derivedId) {
      prepared.cloudinaryPublicId = derivedId;
    }
  }

  if (typeof uploadMapImage !== 'function') {
    if (rawUrl) {
      prepared.imageUrl = rawUrl;
    }
    if (rawBase64) {
      prepared.imageBase64 = rawBase64;
    }
    if (rawType) {
      prepared.imageType = rawType;
    }
    return prepared;
  }

  const shouldUploadFromBase64 = rawBase64 !== '';
  const shouldUploadFromUrl =
    !shouldUploadFromBase64 && rawUrl && (!hasCloudinaryUrl || rawUrl.startsWith('data:'));

  if (!shouldUploadFromBase64 && !shouldUploadFromUrl) {
    if (rawUrl) {
      prepared.imageUrl = rawUrl;
    }
    if (rawBase64) {
      prepared.imageBase64 = rawBase64;
    }
    if (rawType) {
      prepared.imageType = rawType;
    }
    return prepared;
  }

  let uploadSource = rawUrl;
  if (shouldUploadFromBase64) {
    const mimeType = rawType || 'image/png';
    uploadSource = `data:${mimeType};base64,${rawBase64}`;
  }

  try {
    const uploadResult = await uploadMapImage(uploadSource);
    const secureUrl =
      typeof uploadResult?.secure_url === 'string' ? uploadResult.secure_url : null;
    const publicId =
      typeof uploadResult?.public_id === 'string'
        ? uploadResult.public_id.trim()
        : '';

    if (secureUrl) {
      prepared.imageUrl = secureUrl;
      delete prepared.imageBase64;
      delete prepared.imageType;
    } else {
      if (rawUrl) {
        prepared.imageUrl = rawUrl;
      }
      if (rawBase64) {
        prepared.imageBase64 = rawBase64;
      }
      if (rawType) {
        prepared.imageType = rawType;
      }
    }

    if (publicId) {
      prepared.cloudinaryPublicId = publicId;
    }
  } catch (error) {
    logger.warn('Failed to upload map image to Cloudinary', {
      error: error.message,
    });
    if (rawUrl) {
      prepared.imageUrl = rawUrl;
    }
    if (rawBase64) {
      prepared.imageBase64 = rawBase64;
    }
    if (rawType) {
      prepared.imageType = rawType;
    }
  }

  return prepared;
};

const parseFolderFilters = (input) => {
  if (!input) {
    return [];
  }

  const values = Array.isArray(input) ? input : String(input).split(',');

  const sanitized = values
    .map((value) => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      return trimmed || null;
    })
    .filter(Boolean);

  return Array.from(new Set(sanitized));
};

const SHOP_VISIBILITY_CATEGORIES = ['weapons', 'armor', 'items', 'accessories'];

const normalizeShopVisibilityValue = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    const normalizedSet = new Set();
    value.forEach((entry) => {
      if (typeof entry !== 'string') {
        return;
      }
      const normalized = entry.trim().toLowerCase();
      if (normalized) {
        normalizedSet.add(normalized);
      }
    });
    return Array.from(normalizedSet);
  }

  if (typeof value === 'object') {
    const normalizedSet = new Set();
    Object.entries(value).forEach(([key, hidden]) => {
      if (typeof key !== 'string') {
        return;
      }
      const normalized = key.trim().toLowerCase();
      if (!normalized) {
        return;
      }
      if (hidden === true) {
        normalizedSet.add(normalized);
      }
    });
    return Array.from(normalizedSet);
  }

  return [];
};

const normalizeShopVisibility = (input) => {
  const visibility = {};
  SHOP_VISIBILITY_CATEGORIES.forEach((category) => {
    visibility[category] = normalizeShopVisibilityValue(input?.[category]);
  });
  return visibility;
};

const validateShopVisibilityPayload = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('visibility must be an object');
  }

  for (const [category, entries] of Object.entries(value)) {
    if (!SHOP_VISIBILITY_CATEGORIES.includes(category)) {
      throw new Error(`invalid category: ${category}`);
    }

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (typeof entry !== 'string') {
          throw new Error(`category ${category} must be an array of strings`);
        }
      }
      continue;
    }

    if (entries && typeof entries === 'object') {
      for (const hidden of Object.values(entries)) {
        if (typeof hidden !== 'boolean') {
          throw new Error(`category ${category} must map keys to boolean values`);
        }
      }
      continue;
    }

    if (entries !== undefined && entries !== null) {
      throw new Error(`category ${category} must be an array or object`);
    }
  }

  return true;
};

const sanitizeSingleFolder = (folder) => {
  const sanitized = parseFolderFilters(
    Array.isArray(folder) ? folder : folder ? [folder] : []
  );

  return sanitized.length > 0 ? sanitized[0] : null;
};

const ensureAbsoluteTokenFolderPath = (folder, tokenRootFolder) => {
  const sanitized = sanitizeSingleFolder(folder);

  if (!sanitized) {
    return null;
  }

  if (sanitized === tokenRootFolder) {
    return sanitized;
  }

  const normalizedRootPrefix = `${tokenRootFolder}/`;

  if (sanitized.startsWith(normalizedRootPrefix)) {
    return sanitized;
  }

  return `${tokenRootFolder}/${sanitized}`;
};

const resolvePlayerRootFolder = (tokenRootFolder) => {
  const candidates = parseFolderFilters(getDefaultPlayerTokenFolders());

  for (const candidate of candidates) {
    const absolute = ensureAbsoluteTokenFolderPath(candidate, tokenRootFolder);
    if (absolute) {
      return absolute;
    }
  }

  return null;
};

const filterPlayerAccessibleFolders = (inputFolders, playerRootFolder, tokenRootFolder) => {
  if (!playerRootFolder) {
    return [];
  }

  const normalized = parseFolderFilters(inputFolders);

  return normalized
    .map((folder) => ensureAbsoluteTokenFolderPath(folder, tokenRootFolder))
    .filter((absolute) => {
      if (!absolute) {
        return false;
      }

      return absolute === playerRootFolder || absolute.startsWith(`${playerRootFolder}/`);
    });
};

const getDefaultPlayerTokenFolders = () => {
  const raw = process.env.CLOUDINARY_PLAYER_TOKEN_FOLDERS;

  if (typeof raw === 'string' && raw.trim() !== '') {
    return parseFolderFilters(raw.split(','));
  }

  return ['Adventurers'];
};

module.exports = (router) => {
  const campaignRouter = express.Router();

  const createDefaultCombatState = () => ({
    participants: [],
    activeTurn: null,
  });

  const generateEnemyId = () => {
    if (typeof randomUUID === 'function') {
      return randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const parseInitiative = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseTurnIndex = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  };

  const toFiniteNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const createEnemyLookup = (enemies) => {
    const map = new Map();

    if (!Array.isArray(enemies)) {
      return map;
    }

    enemies.forEach((enemy) => {
      if (
        !enemy ||
        typeof enemy.enemyId !== 'string' ||
        enemy.enemyId.trim() === ''
      ) {
        return;
      }

      const trimmedId = enemy.enemyId.trim();
      const rawName =
        typeof enemy.name === 'string' && enemy.name.trim() !== ''
          ? enemy.name.trim()
          : null;

      const maxHp = toFiniteNumberOrNull(enemy.maxHp ?? enemy.hitPoints);
      const currentHpCandidate =
        enemy.currentHp !== undefined
          ? toFiniteNumberOrNull(enemy.currentHp)
          : null;
      const currentHp =
        currentHpCandidate !== null
          ? currentHpCandidate
          : maxHp !== null
            ? maxHp
            : null;

      map.set(trimmedId, {
        ...(rawName ? { displayName: rawName } : {}),
        ...(currentHp !== null ? { currentHp } : {}),
        ...(maxHp !== null ? { maxHp } : {}),
      });
    });

    return map;
  };

  const sanitizeParticipants = (participants, enemyLookup = new Map()) => {
    if (!Array.isArray(participants)) {
      return [];
    }

    return participants
      .map((participant) => {
        if (
          !participant ||
          typeof participant.characterId !== 'string' ||
          participant.characterId.trim() === ''
        ) {
          return null;
        }

        const initiative = parseInitiative(participant.initiative);
        if (initiative === null) {
          return null;
        }

        const trimmedId = participant.characterId.trim();
        const rawDisplayName =
          typeof participant.displayName === 'string' &&
          participant.displayName.trim() !== ''
            ? participant.displayName.trim()
            : null;

        const lookupEntry = enemyLookup.get(trimmedId);
        let displayName = rawDisplayName || null;
        let currentHp = null;
        let maxHp = null;

        if (lookupEntry) {
          if (typeof lookupEntry === 'string') {
            displayName = displayName || lookupEntry;
          } else if (typeof lookupEntry === 'object') {
            if (!displayName && typeof lookupEntry.displayName === 'string') {
              const trimmedDisplay = lookupEntry.displayName.trim();
              if (trimmedDisplay) {
                displayName = trimmedDisplay;
              }
            }

            const normalizedCurrent = toFiniteNumberOrNull(lookupEntry.currentHp);
            if (normalizedCurrent !== null) {
              currentHp = normalizedCurrent;
            }

            const normalizedMax = toFiniteNumberOrNull(lookupEntry.maxHp);
            if (normalizedMax !== null) {
              maxHp = normalizedMax;
            }
          }
        }

        return {
          characterId: trimmedId,
          initiative,
          ...(displayName ? { displayName } : {}),
          ...(currentHp !== null ? { currentHp } : {}),
          ...(maxHp !== null ? { maxHp } : {}),
        };
      })
      .filter(Boolean);
  };

  const withDefaultCombat = (campaign) => {
    if (!campaign) {
      return campaign;
    }

    const enemyLookup = createEnemyLookup(campaign.enemies);
    const participants = sanitizeParticipants(
      campaign.combat?.participants,
      enemyLookup
    );
    const requestedTurn = parseTurnIndex(campaign.combat?.activeTurn);
    const activeTurn =
      requestedTurn !== null &&
      requestedTurn >= 0 &&
      requestedTurn < participants.length
        ? requestedTurn
        : null;

    return {
      ...campaign,
      combat: {
        participants,
        activeTurn,
      },
      enemies: Array.isArray(campaign.enemies) ? campaign.enemies : [],
    };
  };

  const applyDefaultCombat = (campaigns) => {
    if (Array.isArray(campaigns)) {
      return campaigns.map(withDefaultCombat);
    }
    return withDefaultCombat(campaigns);
  };

  const cloneMapTokens = (tokensByMapId = {}) => {
    if (!tokensByMapId || typeof tokensByMapId !== 'object') {
      return {};
    }

    return Object.keys(tokensByMapId).reduce((acc, mapId) => {
      const mapTokens = tokensByMapId[mapId];
      if (!mapTokens || typeof mapTokens !== 'object' || Array.isArray(mapTokens)) {
        return acc;
      }

      acc[mapId] = Object.keys(mapTokens).reduce((tokenAcc, characterId) => {
        const entry = mapTokens[characterId];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          tokenAcc[characterId] = { ...entry };
        }
        return tokenAcc;
      }, {});

      return acc;
    }, {});
  };

  const resolveActiveMapState = ({
    maps,
    requestedActiveMapId,
    tokensByMapId = {},
  }) => {
    const availableMaps = Array.isArray(maps) ? maps : [];
    const trimmedActiveId =
      typeof requestedActiveMapId === 'string' && requestedActiveMapId.trim() !== ''
        ? requestedActiveMapId.trim()
        : null;

    let activeMapId =
      trimmedActiveId && availableMaps.some((map) => map.mapId === trimmedActiveId)
        ? trimmedActiveId
        : null;

    if (!activeMapId && availableMaps.length > 0) {
      activeMapId = availableMaps[0].mapId;
    }

    const activeMapTokens =
      activeMapId && tokensByMapId && typeof tokensByMapId === 'object'
        ? tokensByMapId[activeMapId] || {}
        : {};

    return { activeMapId, activeMapTokens };
  };

  // Apply authentication to all campaign routes
  campaignRouter.use(authenticateToken);

  // Add players to a campaign (protected route)
  campaignRouter.route('/players/add/:campaign').put(
    [
      param('campaign').trim().notEmpty().withMessage('campaign is required'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
      if (!Array.isArray(req.body)) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'body must be an array of players', param: 'body' }] });
      }
      const campaignName = req.params.campaign;
      const newPlayers = req.body; // Assuming newPlayers is an array of players

      try {
        const db_connect = req.db;
        const result = await db_connect.collection("Campaigns").updateOne(
          { campaignName: campaignName },
          { $addToSet: { players: { $each: newPlayers } } }
        );
        logger.info("Players added");
        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'Players already exist in the array' });
        }
        res.json({ message: 'Players added successfully' });
      } catch (err) {
        logger.error(`Error adding players: ${err}`);
        next(err);
      }
    }
  );

  const CAMPAIGN_SUMMARY_PROJECTION = {
    projection: {
      campaignName: 1,
      dm: 1,
      players: 1,
      gameMode: 1,
      'maps.mapId': 1,
      'maps.name': 1,
      'maps.imageUrl': 1,
      'maps.image': 1,
      'maps.thumbnailUrl': 1,
      activeMapId: 1,
      recentAccess: 1,
    },
  };

  // This section will get a list of all the campaigns.
  campaignRouter.route('/player/:player').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .find({ players: { $in: [req.params.player] } }, CAMPAIGN_SUMMARY_PROJECTION)
        .toArray();
      res.json(applyDefaultCombat(result));
    } catch (err) {
      next(err);
    }
  });

  // This section will be for the DM
  campaignRouter.route('/dm/:DM').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .find({ dm: req.params.DM }, CAMPAIGN_SUMMARY_PROJECTION)
        .toArray();
      res.json(applyDefaultCombat(result));
    } catch (err) {
      next(err);
    }
  });

  campaignRouter.route('/dm/:DM/:campaign').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .findOne({ dm: req.params.DM, campaignName: req.params.campaign });
      res.json(withDefaultCombat(result));
    } catch (err) {
      next(err);
    }
  });

  campaignRouter
    .route('/:campaign/map')
    .get(
      [param('campaign').trim().notEmpty().withMessage('campaign is required')],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const campaign = await db_connect
            .collection('Campaigns')
            .findOne({ campaignName: req.params.campaign });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }
          const collection = db_connect.collection('Campaigns');
          const { payload } = await normalizeCampaignMapState({
            campaign,
            collection,
          });

          if (!payload.map) {
            return res.status(404).json({ message: 'Map not found' });
          }

          return res.json(payload.map);
        } catch (err) {
          next(err);
        }
      }
    )
    .put(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        body('map')
          .custom((value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
              throw new Error('map must be an object');
            }
            return true;
          })
          .withMessage('map must be provided'),
        body('prompt')
          .optional({ nullable: true })
          .custom((value) => {
            if (value === null || value === undefined) {
              return true;
            }
            if (typeof value !== 'string') {
              throw new Error('prompt must be a string');
            }
            return true;
          }),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const campaignName = req.params.campaign;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          if (!req.user || campaign.dm !== req.user.username) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection,
          });

          const existingMap = normalizedCampaign?.activeMapId
            ? normalizedCampaign.maps.find((map) => map.mapId === normalizedCampaign.activeMapId)
            : null;

          const prepared = prepareStoredMap({
            mapInput: req.body.map,
            existingMap,
            prompt:
              typeof req.body.prompt === 'string' && req.body.prompt.trim() !== ''
                ? req.body.prompt
                : undefined,
          });

          if (!prepared.success) {
            return res.status(400).json({ message: prepared.error });
          }

          const storedMap = prepared.data;

          const nextMaps = Array.isArray(normalizedCampaign.maps)
            ? normalizedCampaign.maps.filter((map) => map.mapId !== storedMap.mapId)
            : [];
          nextMaps.push(storedMap);

          const nextTokens = cloneMapTokens(normalizedCampaign.mapTokens);

          const payload = buildCampaignMapPayload(
            nextMaps,
            storedMap.mapId,
            nextTokens
          );

          await collection.updateOne(
            { campaignName },
            {
              $set: {
                maps: payload.maps,
                activeMapId: payload.activeMapId,
                map: payload.map || null,
                mapTokens: payload.tokensByMapId,
              },
            }
          );

          emitMapUpdate(campaignName, payload);

          return res.json(payload.map);
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/maps')
    .get(
      [param('campaign').trim().notEmpty().withMessage('campaign is required')],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({
            campaignName: req.params.campaign,
          });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const { payload } = await normalizeCampaignMapState({
            campaign,
            collection,
          });

          return res.json(payload);
        } catch (err) {
          next(err);
        }
      }
    )
    .post(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        body('map')
          .custom((value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
              throw new Error('map must be an object');
            }
            return true;
          })
          .withMessage('map must be provided'),
        body('prompt')
          .optional({ nullable: true })
          .custom((value) => {
            if (value === null || value === undefined) {
              return true;
            }
            if (typeof value !== 'string') {
              throw new Error('prompt must be a string');
            }
            return true;
          }),
        body('activate')
          .optional()
          .isBoolean()
          .withMessage('activate must be a boolean')
          .toBoolean(),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const campaignName = req.params.campaign;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          if (!req.user || campaign.dm !== req.user.username) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection,
          });

          const mapInput = await prepareMapAssetsForStorage(req.body.map);

          const prepared = prepareStoredMap({
            mapInput,
            existingMap: null,
            prompt:
              typeof req.body.prompt === 'string' && req.body.prompt.trim() !== ''
                ? req.body.prompt
                : undefined,
          });

          if (!prepared.success) {
            return res.status(400).json({ message: prepared.error });
          }

          const storedMap = prepared.data;

          const nextMaps = Array.isArray(normalizedCampaign.maps)
            ? [...normalizedCampaign.maps, storedMap]
            : [storedMap];

          const requestedActivation =
            req.body.activate === undefined
              ? !normalizedCampaign.activeMapId
              : Boolean(req.body.activate);

          const desiredActiveId = requestedActivation
            ? storedMap.mapId
            : normalizedCampaign.activeMapId;

          const nextTokens = cloneMapTokens(normalizedCampaign.mapTokens);

          const payload = buildCampaignMapPayload(
            nextMaps,
            desiredActiveId || storedMap.mapId,
            nextTokens
          );

          await collection.updateOne(
            { campaignName },
            {
              $set: {
                maps: payload.maps,
                activeMapId: payload.activeMapId,
                map: payload.map || null,
                mapTokens: payload.tokensByMapId,
              },
            }
          );

          emitMapUpdate(campaignName, payload);

          return res.json(payload);
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/maps/:mapId')
    .patch(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        param('mapId').trim().notEmpty().withMessage('mapId is required'),
        body('map')
          .optional()
          .custom((value) => {
            if (value === undefined) {
              return true;
            }
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
              throw new Error('map must be an object');
            }
            return true;
          }),
        body('prompt')
          .optional({ nullable: true })
          .custom((value) => {
            if (value === null || value === undefined) {
              return true;
            }
            if (typeof value !== 'string') {
              throw new Error('prompt must be a string');
            }
            return true;
          }),
        body('active')
          .optional()
          .isBoolean()
          .withMessage('active must be a boolean')
          .toBoolean(),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const mapId = req.params.mapId;
          const db_connect = req.db;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          if (!req.user || campaign.dm !== req.user.username) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const wantsActivation = req.body.active === true;
          const hasMapUpdate = req.body.map !== undefined;

          if (!wantsActivation && !hasMapUpdate) {
            return res.status(400).json({ message: 'No updates provided' });
          }

          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection,
          });

          const targetMap = Array.isArray(normalizedCampaign.maps)
            ? normalizedCampaign.maps.find((map) => map.mapId === mapId)
            : null;

          if (!targetMap) {
            return res.status(404).json({ message: 'Map not found' });
          }

          let storedMap = targetMap;

          if (hasMapUpdate) {
            const mapInput = await prepareMapAssetsForStorage(req.body.map);

            const prepared = prepareStoredMap({
              mapInput,
              existingMap: targetMap,
              prompt:
                typeof req.body.prompt === 'string' && req.body.prompt.trim() !== ''
                  ? req.body.prompt
                  : undefined,
            });

            if (!prepared.success) {
              return res.status(400).json({ message: prepared.error });
            }

            storedMap = prepared.data;
          }

          const nextMaps = normalizedCampaign.maps.map((map) =>
            map.mapId === mapId ? storedMap : map
          );

          const desiredActiveId = wantsActivation
            ? mapId
            : normalizedCampaign.activeMapId;

          const nextTokens = cloneMapTokens(normalizedCampaign.mapTokens);

          const payload = buildCampaignMapPayload(
            nextMaps,
            desiredActiveId,
            nextTokens
          );

          await collection.updateOne(
            { campaignName },
            {
              $set: {
                maps: payload.maps,
                activeMapId: payload.activeMapId,
                map: payload.map || null,
                mapTokens: payload.tokensByMapId,
              },
            }
          );

          emitMapUpdate(campaignName, payload);

          return res.json(payload);
        } catch (err) {
          next(err);
        }
      }
    )
    .delete(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        param('mapId').trim().notEmpty().withMessage('mapId is required'),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const mapId = req.params.mapId;
          const db_connect = req.db;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          if (!req.user || campaign.dm !== req.user.username) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection,
          });

          const existingMap = Array.isArray(normalizedCampaign.maps)
            ? normalizedCampaign.maps.find((map) => map.mapId === mapId)
            : null;

          if (!existingMap) {
            return res.status(404).json({ message: 'Map not found' });
          }

          const attemptCloudinaryDeletion = async () => {
            if (typeof deleteMapImage !== 'function') {
              return;
            }

            const explicitId =
              typeof existingMap.cloudinaryPublicId === 'string'
                ? existingMap.cloudinaryPublicId.trim()
                : '';
            const derivedId =
              !explicitId && typeof existingMap.imageUrl === 'string'
                ? deriveCloudinaryPublicIdFromUrl(existingMap.imageUrl)
                : null;
            const targetPublicId = explicitId || derivedId;

            if (!targetPublicId) {
              return;
            }

            try {
              await deleteMapImage(targetPublicId);
            } catch (cloudinaryError) {
              logger.warn('Failed to delete map image from Cloudinary', {
                error: cloudinaryError.message,
                publicId: targetPublicId,
              });
            }
          };

          await attemptCloudinaryDeletion();

          const remainingMaps = normalizedCampaign.maps.filter(
            (map) => map.mapId !== mapId
          );

          const desiredActiveId =
            normalizedCampaign.activeMapId === mapId
              ? null
              : normalizedCampaign.activeMapId;

          const nextTokens = cloneMapTokens(normalizedCampaign.mapTokens);
          delete nextTokens[mapId];

          const payload = buildCampaignMapPayload(
            remainingMaps,
            desiredActiveId,
            nextTokens
          );

          await collection.updateOne(
            { campaignName },
            {
              $set: {
                maps: payload.maps,
                activeMapId: payload.activeMapId,
                map: payload.map || null,
                mapTokens: payload.tokensByMapId,
              },
            }
          );

          emitMapUpdate(campaignName, payload);

          return res.json(payload);
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/maps/:mapId/tokens/:characterId')
    .put(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        param('mapId').trim().notEmpty().withMessage('mapId is required'),
        param('characterId')
          .trim()
          .notEmpty()
          .withMessage('characterId is required'),
        body('x').isFloat().withMessage('x must be a number').toFloat(),
        body('y').isFloat().withMessage('y must be a number').toFloat(),
        body('rotation')
          .optional()
          .isFloat()
          .withMessage('rotation must be a number')
          .toFloat(),
        body('size').optional().isString().withMessage('size must be a string').trim(),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const mapId = req.params.mapId;
          const characterId = req.params.characterId;
          const db_connect = req.db;
          const campaignsCollection = db_connect.collection('Campaigns');
          const campaign = await campaignsCollection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const trimmedCharacterId = characterId.trim();

          const isDm = req.user && campaign.dm === req.user.username;
          if (!isDm) {
            const charactersCollection = db_connect.collection('Characters');
            const orConditions = [{ characterId: trimmedCharacterId }];
            if (ObjectId.isValid(trimmedCharacterId)) {
              orConditions.push({ _id: new ObjectId(trimmedCharacterId) });
            }

            const character = await charactersCollection.findOne(
              {
                campaign: campaignName,
                $or: orConditions,
              },
              { projection: { token: 1 } }
            );

            if (!character || character.token !== req.user?.username) {
              return res.status(403).json({ message: 'Forbidden' });
            }
          }

          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection: campaignsCollection,
          });

          const targetMap = Array.isArray(normalizedCampaign.maps)
            ? normalizedCampaign.maps.find((map) => map.mapId === mapId)
            : null;

          if (!targetMap) {
            return res.status(404).json({ message: 'Map not found' });
          }

          const nextTokens = cloneMapTokens(normalizedCampaign.mapTokens);
          const now = new Date().toISOString();

          if (!nextTokens[mapId] || typeof nextTokens[mapId] !== 'object') {
            nextTokens[mapId] = {};
          }

          const existingEntry =
            nextTokens[mapId] &&
            typeof nextTokens[mapId] === 'object' &&
            nextTokens[mapId][trimmedCharacterId] &&
            typeof nextTokens[mapId][trimmedCharacterId] === 'object'
              ? nextTokens[mapId][trimmedCharacterId]
              : {};

          nextTokens[mapId][trimmedCharacterId] = {
            ...existingEntry,
            characterId: trimmedCharacterId,
            x: req.body.x,
            y: req.body.y,
            updatedAt: now,
          };

          if (Object.prototype.hasOwnProperty.call(req.body, 'rotation')) {
            const normalizedRotation = normalizeTokenRotation(req.body.rotation);
            if (normalizedRotation === null) {
              delete nextTokens[mapId][trimmedCharacterId].rotation;
            } else {
              nextTokens[mapId][trimmedCharacterId].rotation = normalizedRotation;
            }
          }

          if (Object.prototype.hasOwnProperty.call(req.body, 'size')) {
            const normalizedSize = normalizeTokenSize(req.body.size);
            if (normalizedSize) {
              nextTokens[mapId][trimmedCharacterId].size = normalizedSize;
            } else {
              delete nextTokens[mapId][trimmedCharacterId].size;
            }
          }

          const { tokensByMapId } = normalizeMapTokens({
            mapTokens: nextTokens,
            validMapIds: new Set(
              Array.isArray(normalizedCampaign.maps)
                ? normalizedCampaign.maps.map((map) => map.mapId)
                : []
            ),
            now,
          });

          const { activeMapId: resolvedActiveMapId, activeMapTokens } =
            resolveActiveMapState({
              maps: normalizedCampaign.maps,
              requestedActiveMapId: normalizedCampaign.activeMapId,
              tokensByMapId,
            });

          const tokenPayload = {
            activeMapId: resolvedActiveMapId,
            tokensByMapId,
            activeMapTokens,
          };

          const setDocument = {
            mapTokens: tokensByMapId,
          };

          if (resolvedActiveMapId !== normalizedCampaign.activeMapId) {
            setDocument.activeMapId = resolvedActiveMapId;
          }

          if (resolvedActiveMapId) {
            setDocument['map.tokens'] = activeMapTokens;
          }

          await campaignsCollection.updateOne(
            { campaignName },
            {
              $set: setDocument,
            }
          );

          emitMapUpdate(campaignName, tokenPayload);

          return res.json(tokenPayload);
        } catch (err) {
          next(err);
        }
      }
    )
    .delete(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        param('mapId').trim().notEmpty().withMessage('mapId is required'),
        param('characterId')
          .trim()
          .notEmpty()
          .withMessage('characterId is required'),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const mapId = req.params.mapId;
          const characterId = req.params.characterId;
          const db_connect = req.db;
          const campaignsCollection = db_connect.collection('Campaigns');
          const campaign = await campaignsCollection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const trimmedCharacterId = characterId.trim();

          const isDm = req.user && campaign.dm === req.user.username;
          if (!isDm) {
            const charactersCollection = db_connect.collection('Characters');
            const orConditions = [{ characterId: trimmedCharacterId }];
            if (ObjectId.isValid(trimmedCharacterId)) {
              orConditions.push({ _id: new ObjectId(trimmedCharacterId) });
            }

            const character = await charactersCollection.findOne(
              {
                campaign: campaignName,
                $or: orConditions,
              },
              { projection: { token: 1 } }
            );

            if (!character || character.token !== req.user?.username) {
              return res.status(403).json({ message: 'Forbidden' });
            }
          }

          const { campaign: normalizedCampaign } = await normalizeCampaignMapState({
            campaign,
            collection: campaignsCollection,
          });

          const targetMap = Array.isArray(normalizedCampaign.maps)
            ? normalizedCampaign.maps.find((map) => map.mapId === mapId)
            : null;

          if (!targetMap) {
            return res.status(404).json({ message: 'Map not found' });
          }

          const existingTokens =
            normalizedCampaign.mapTokens &&
            typeof normalizedCampaign.mapTokens === 'object'
              ? normalizedCampaign.mapTokens[mapId]
              : null;

          if (
            !existingTokens ||
            typeof existingTokens !== 'object' ||
            !existingTokens[trimmedCharacterId]
          ) {
            return res.status(404).json({ message: 'Token not found' });
          }

          const nextTokens = cloneMapTokens(normalizedCampaign.mapTokens);
          if (nextTokens[mapId]) {
            delete nextTokens[mapId][trimmedCharacterId];
            if (Object.keys(nextTokens[mapId]).length === 0) {
              delete nextTokens[mapId];
            }
          }

          const { tokensByMapId } = normalizeMapTokens({
            mapTokens: nextTokens,
            validMapIds: new Set(
              Array.isArray(normalizedCampaign.maps)
                ? normalizedCampaign.maps.map((map) => map.mapId)
                : []
            ),
            now: new Date().toISOString(),
          });

          const { activeMapId: resolvedActiveMapId, activeMapTokens } =
            resolveActiveMapState({
              maps: normalizedCampaign.maps,
              requestedActiveMapId: normalizedCampaign.activeMapId,
              tokensByMapId,
            });

          const tokenPayload = {
            activeMapId: resolvedActiveMapId,
            tokensByMapId,
            activeMapTokens,
          };

          const setDocument = {
            mapTokens: tokensByMapId,
          };

          if (resolvedActiveMapId !== normalizedCampaign.activeMapId) {
            setDocument.activeMapId = resolvedActiveMapId;
          }

          if (resolvedActiveMapId) {
            setDocument['map.tokens'] = activeMapTokens;
          }

          await campaignsCollection.updateOne(
            { campaignName },
            {
              $set: setDocument,
            }
          );

          emitMapUpdate(campaignName, tokenPayload);

          return res.json(tokenPayload);
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/shop-visibility')
    .get(
      [param('campaign').trim().notEmpty().withMessage('campaign is required')],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const db_connect = req.db;
          const campaign = await db_connect.collection('Campaigns').findOne(
            { campaignName },
            { projection: { dm: 1, players: 1, shopVisibility: 1 } }
          );

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const username = typeof req.user?.username === 'string' ? req.user.username : null;
          const isDm = username && campaign.dm === username;
          const isPlayer =
            username &&
            Array.isArray(campaign.players) &&
            campaign.players.includes(username);

          if (!isDm && !isPlayer) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const visibility = normalizeShopVisibility(campaign.shopVisibility || {});
          return res.json(visibility);
        } catch (err) {
          next(err);
        }
      }
    )
    .put(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        body().custom(validateShopVisibilityPayload),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const db_connect = req.db;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne(
            { campaignName },
            { projection: { dm: 1 } }
          );

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          if (!req.user || campaign.dm !== req.user.username) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const visibility = normalizeShopVisibility(req.body || {});

          await collection.updateOne(
            { campaignName },
            { $set: { shopVisibility: visibility } },
            { upsert: false }
          );

          return res.json(visibility);
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter.route('/:campaign/access').put(
    [param('campaign').trim().notEmpty().withMessage('campaign is required')],
    handleValidationErrors,
    async (req, res, next) => {
      try {
        const username = typeof req.user?.username === 'string' ? req.user.username.trim() : '';
        if (!username) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const campaignName = req.params.campaign;
        const collection = req.db.collection('Campaigns');
        const campaign = await collection.findOne(
          { campaignName },
          { projection: { dm: 1, players: 1, recentAccess: 1 } }
        );

        if (!campaign) {
          return res.status(404).json({ message: 'Campaign not found' });
        }

        const isDm = campaign.dm === username;
        const isPlayer = Array.isArray(campaign.players) && campaign.players.includes(username);
        if (!isDm && !isPlayer) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        const lastAccessedAt = new Date().toISOString();
        const recentAccess = Array.isArray(campaign.recentAccess)
          ? campaign.recentAccess.filter((entry) => entry && entry.username !== username)
          : [];
        recentAccess.push({ username, lastAccessedAt });

        await collection.updateOne(
          { campaignName },
          { $set: { recentAccess } }
        );

        return res.json({ username, lastAccessedAt });
      } catch (err) {
        next(err);
      }
    }
  );

  // This section will create a new campaign.
  campaignRouter.route('/add').post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      campaignName: req.body.campaignName,
      gameMode: req.body.gameMode,
      dm: req.body.dm,
      players: Array.isArray(req.body.players) ? req.body.players : [],
      maps: [],
      activeMapId: null,
      map: null,
      mapTokens: {},
      combat: createDefaultCombatState(),
      enemies: [],
      recentAccess: [],
    };
    try {
      const result = await db_connect.collection("Campaigns").insertOne(myobj);
      response.json(result);
    } catch (err) {
      next(err);
    }
   });

  // This section will find all characters in a specific campaign.
  campaignRouter.route('/:campaign/characters').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Characters")
        .find({ campaign: req.params.campaign })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  campaignRouter
    .route('/:campaign/enemies')
    .get(
      [param('campaign').trim().notEmpty().withMessage('campaign is required')],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const campaign = await db_connect
            .collection('Campaigns')
            .findOne({ campaignName: req.params.campaign });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          res.json(Array.isArray(campaign.enemies) ? campaign.enemies : []);
        } catch (err) {
          next(err);
        }
      }
    )
    .post(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        body('index').trim().notEmpty().withMessage('index is required'),
        body('name').optional().isString().withMessage('name must be a string'),
        body('figurineImageUrl')
          .optional({ nullable: true })
          .isString()
          .withMessage('figurineImageUrl must be a string')
          .trim(),
        body('figurineImagePublicId')
          .optional({ nullable: true })
          .isString()
          .withMessage('figurineImagePublicId must be a string')
          .trim(),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        const campaignName = req.params.campaign;
        const { index, name } = req.body;

        try {
          const monster = await getMonsterByIndex(index);
          const enemyId = generateEnemyId();
          const rawFigurineUrl =
            typeof req.body.figurineImageUrl === 'string'
              ? req.body.figurineImageUrl.trim()
              : '';
          const rawFigurinePublicId =
            typeof req.body.figurineImagePublicId === 'string'
              ? req.body.figurineImagePublicId.trim()
              : '';

          let suggestedFigurine = null;
          if (!rawFigurineUrl && !rawFigurinePublicId && typeof suggestEnemyFigurine === 'function') {
            try {
              suggestedFigurine = await suggestEnemyFigurine(monster);
            } catch (suggestionError) {
              logger.warn('Failed to suggest figurine for enemy', {
                error: suggestionError.message,
                monsterIndex: monster?.index,
              });
            }
          }

          const enemyRecord = buildEnemyRecord(monster, enemyId, name, {
            figurineImageUrl:
              rawFigurineUrl || suggestedFigurine?.figurineImageUrl || null,
            figurineImagePublicId:
              rawFigurinePublicId || suggestedFigurine?.figurineImagePublicId || null,
          });

          if (!enemyRecord) {
            return res.status(500).json({ message: 'Failed to create enemy record' });
          }

          const db_connect = req.db;
          const result = await db_connect.collection('Campaigns').findOneAndUpdate(
            { campaignName },
            { $push: { enemies: enemyRecord } },
            { returnDocument: 'after' }
          );

          if (!result.value) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          emitEnemiesUpdate(campaignName, result.value.enemies);

          res.json(enemyRecord);
        } catch (err) {
          if (err.statusCode === 404) {
            return res.status(404).json({ message: 'Monster not found' });
          }
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/enemies/:enemyId')
    .delete(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        param('enemyId').trim().notEmpty().withMessage('enemyId is required'),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const { enemyId } = req.params;
          const db_connect = req.db;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const existingEnemies = Array.isArray(campaign.enemies) ? campaign.enemies : [];
          if (!existingEnemies.some((enemy) => enemy.enemyId === enemyId)) {
            return res.status(404).json({ message: 'Enemy not found' });
          }

          const updatedEnemies = existingEnemies.filter((enemy) => enemy.enemyId !== enemyId);
          const enemyLookup = createEnemyLookup(updatedEnemies);
          const participants = sanitizeParticipants(
            campaign.combat?.participants,
            enemyLookup
          ).filter(
            (participant) => participant.characterId !== enemyId
          );

          let activeTurn = parseTurnIndex(campaign.combat?.activeTurn);
          if (activeTurn !== null && activeTurn >= participants.length) {
            activeTurn = participants.length > 0 ? Math.min(activeTurn, participants.length - 1) : null;
          }

          const combatState = { participants, activeTurn };

          await collection.updateOne(
            { campaignName },
            { $set: { enemies: updatedEnemies, combat: combatState } }
          );

          emitEnemiesUpdate(campaignName, updatedEnemies);
          emitCombatUpdate(campaignName, combatState);

          res.json({ success: true, enemies: updatedEnemies, combat: combatState });
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/enemies/:enemyId/health')
    .put(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        param('enemyId').trim().notEmpty().withMessage('enemyId is required'),
        body('currentHp')
          .optional({ nullable: true })
          .custom((value) => {
            if (value === null || value === undefined || value === '') {
              return true;
            }

            const parsed = Number(value);
            if (!Number.isFinite(parsed)) {
              throw new Error('currentHp must be a number');
            }

            return true;
          }),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const { enemyId } = req.params;
          const db_connect = req.db;
          const collection = db_connect.collection('Campaigns');
          const campaign = await collection.findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const existingEnemies = Array.isArray(campaign.enemies) ? campaign.enemies : [];
          const enemyIndex = existingEnemies.findIndex(
            (enemy) => enemy?.enemyId === enemyId
          );

          if (enemyIndex === -1) {
            return res.status(404).json({ message: 'Enemy not found' });
          }

          const enemyRecord = existingEnemies[enemyIndex];
          const maxHp = toFiniteNumberOrNull(enemyRecord.maxHp ?? enemyRecord.hitPoints);
          let nextCurrentHp = null;

          if (!(req.body.currentHp === null || req.body.currentHp === undefined || req.body.currentHp === '')) {
            nextCurrentHp = toFiniteNumberOrNull(req.body.currentHp);
            if (nextCurrentHp === null) {
              return res.status(400).json({ message: 'currentHp must be a finite number' });
            }

            if (nextCurrentHp < 0) {
              nextCurrentHp = 0;
            }

            if (maxHp !== null && nextCurrentHp > maxHp) {
              nextCurrentHp = maxHp;
            }
          }

          const updatedEnemy = {
            ...enemyRecord,
            ...(nextCurrentHp === null ? { currentHp: undefined } : { currentHp: nextCurrentHp }),
          };

          if (nextCurrentHp === null) {
            delete updatedEnemy.currentHp;
          }

          const updatedEnemies = existingEnemies.slice();
          updatedEnemies[enemyIndex] = updatedEnemy;

          const enemyLookup = createEnemyLookup(updatedEnemies);
          const participants = sanitizeParticipants(
            campaign.combat?.participants,
            enemyLookup
          );

          let activeTurn = parseTurnIndex(campaign.combat?.activeTurn);
          if (activeTurn !== null && activeTurn >= participants.length) {
            activeTurn = participants.length > 0 ? Math.min(activeTurn, participants.length - 1) : null;
          }

          const combatState = { participants, activeTurn };

          await collection.updateOne(
            { campaignName },
            { $set: { enemies: updatedEnemies, combat: combatState } }
          );

          emitEnemiesUpdate(campaignName, updatedEnemies);
          emitCombatUpdate(campaignName, combatState);

          res.json({ success: true, enemy: updatedEnemy, combat: combatState });
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/combat')
    .get(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const campaign = await db_connect
            .collection('Campaigns')
            .findOne({ campaignName: req.params.campaign });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          res.json(withDefaultCombat(campaign).combat);
        } catch (err) {
          next(err);
        }
      }
    )
    .put(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        body('participants')
          .isArray()
          .withMessage('participants must be an array'),
        body('participants.*.characterId')
          .isString()
          .withMessage('characterId must be a string')
          .trim()
          .notEmpty()
          .withMessage('characterId is required'),
        body('participants.*.initiative').custom((value) => {
          if (!Number.isFinite(Number(value))) {
            throw new Error('initiative must be a number');
          }
          return true;
        }),
        body('activeTurn')
          .optional({ nullable: true })
          .custom((value, { req }) => {
            if (value === null || value === undefined) {
              req.body.activeTurn = null;
              return true;
            }

            const parsed = parseTurnIndex(value);
            if (parsed === null) {
              throw new Error('activeTurn must be an integer or null');
            }

            if (
              !Array.isArray(req.body.participants) ||
              parsed < 0 ||
              parsed >= req.body.participants.length
            ) {
              throw new Error('activeTurn must reference a valid participant');
            }

            req.body.activeTurn = parsed;
            return true;
          }),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const db_connect = req.db;
          const campaign = await db_connect
            .collection('Campaigns')
            .findOne({ campaignName: req.params.campaign });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const normalizedCampaign = withDefaultCombat(campaign);
          const isDm = req.user && campaign.dm === req.user.username;
          const username =
            typeof req.user?.username === 'string'
              ? req.user.username.trim()
              : null;
          const normalizedPlayers = Array.isArray(campaign.players)
            ? campaign.players
                .map((player) => {
                  if (typeof player === 'string') {
                    const trimmed = player.trim();
                    return trimmed || null;
                  }

                  if (
                    player &&
                    typeof player === 'object' &&
                    typeof player.username === 'string'
                  ) {
                    const trimmed = player.username.trim();
                    return trimmed || null;
                  }

                  return null;
                })
                .filter(Boolean)
            : [];

          if (!isDm) {
            if (!username || !normalizedPlayers.includes(username)) {
              return res.status(403).json({ message: 'Forbidden' });
            }
          }

          const enemyLookup = createEnemyLookup(campaign.enemies);
          const participants = sanitizeParticipants(
            req.body.participants,
            enemyLookup
          );

          if (participants.length !== req.body.participants.length) {
            return res
              .status(400)
              .json({ errors: [{ msg: 'participants contain invalid entries', param: 'participants' }] });
          }

          const activeTurn =
            req.body.activeTurn === null || req.body.activeTurn === undefined
              ? null
              : req.body.activeTurn;

          if (!isDm) {
            const currentParticipants = Array.isArray(
              normalizedCampaign?.combat?.participants
            )
              ? normalizedCampaign.combat.participants
              : [];

            const currentTurnIndex = Number.isInteger(
              normalizedCampaign?.combat?.activeTurn
            )
              ? normalizedCampaign.combat.activeTurn
              : null;

            const participantsMatch =
              participants.length === currentParticipants.length &&
              participants.every((participant, index) => {
                const current = currentParticipants[index];
                return (
                  current &&
                  current.characterId === participant.characterId &&
                  current.initiative === participant.initiative
                );
              });

            if (!participantsMatch) {
              return res.status(403).json({ message: 'Forbidden' });
            }

            if (
              currentTurnIndex === null ||
              currentTurnIndex < 0 ||
              currentTurnIndex >= currentParticipants.length ||
              currentParticipants.length === 0
            ) {
              return res.status(403).json({ message: 'Forbidden' });
            }

            const activeParticipant = currentParticipants[currentTurnIndex];
            if (!activeParticipant) {
              return res.status(403).json({ message: 'Forbidden' });
            }

            const characterFilters = [
              { characterId: activeParticipant.characterId },
            ];

            if (ObjectId.isValid(activeParticipant.characterId)) {
              characterFilters.push({ _id: new ObjectId(activeParticipant.characterId) });
            }

            const charactersCollection = db_connect.collection('Characters');
            const activeCharacter = await charactersCollection.findOne({
              campaign: campaign.campaignName,
              $or: characterFilters,
            });

            const ownerCandidates = [
              activeCharacter?.token,
              activeCharacter?.player,
              activeCharacter?.owner,
              activeCharacter?.username,
            ]
              .filter((value) => typeof value === 'string')
              .map((value) => value.trim())
              .filter(Boolean);

            if (!ownerCandidates.includes(username)) {
              return res.status(403).json({ message: 'Forbidden' });
            }

            const expectedNextTurn =
              (currentTurnIndex + 1) % currentParticipants.length;

            if (activeTurn !== expectedNextTurn) {
              return res.status(403).json({ message: 'Forbidden' });
            }
          }

          if (
            activeTurn !== null &&
            (activeTurn < 0 || activeTurn >= participants.length)
          ) {
            return res
              .status(400)
              .json({ errors: [{ msg: 'activeTurn must reference a valid participant', param: 'activeTurn' }] });
          }

          const combatState = {
            participants,
            activeTurn,
          };

          await db_connect
            .collection('Campaigns')
            .updateOne(
              { campaignName: req.params.campaign },
              { $set: { combat: combatState } }
            );

          await resetActiveDeathSaveRoll(db_connect, combatState);

          emitCombatUpdate(req.params.campaign, combatState);

          res.json(combatState);
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/token-folders')
    .get(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        query('folders').optional(),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const db_connect = req.db;
          const campaign = await db_connect
            .collection('Campaigns')
            .findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const isDm = req.user && campaign.dm === req.user.username;
          const tokenRootFolder = getTokenRootFolder();

          if (isDm) {
            const requestedFolders = parseFolderFilters(req.query.folders);

            try {
              const folderTree = await listTokenFolderTree({ folders: requestedFolders });
              return res.json(folderTree);
            } catch (error) {
              logger.warn('Failed to load token folder tree from Cloudinary', {
                campaign: campaignName,
                error: error.message,
              });
              return res.json({
                rootFolder: tokenRootFolder,
                folders: [],
                flatFolders: [],
              });
            }
          }

          const playerRootFolder = resolvePlayerRootFolder(tokenRootFolder);
          if (!playerRootFolder) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const allowedFolders = filterPlayerAccessibleFolders(
            req.query.folders,
            playerRootFolder,
            tokenRootFolder
          );

          const folderTargets =
            allowedFolders.length > 0 ? allowedFolders : [playerRootFolder];

          try {
            const folderTree = await listTokenFolderTree({ folders: folderTargets });
            return res.json(folderTree);
          } catch (error) {
            logger.warn('Failed to load token folder tree from Cloudinary', {
              campaign: campaignName,
              error: error.message,
            });
            return res.json({
              rootFolder: playerRootFolder,
              folders: [],
              flatFolders: [],
            });
          }
        } catch (err) {
          next(err);
        }
      }
    );

  campaignRouter
    .route('/:campaign/token-manifest')
    .get(
      [
        param('campaign').trim().notEmpty().withMessage('campaign is required'),
        query('nextCursor').optional().isString().trim(),
        query('folders').optional(),
      ],
      handleValidationErrors,
      async (req, res, next) => {
        try {
          const campaignName = req.params.campaign;
          const db_connect = req.db;
          const campaign = await db_connect
            .collection('Campaigns')
            .findOne({ campaignName });

          if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
          }

          const isDm = req.user && campaign.dm === req.user.username;
          const playerFolders = getDefaultPlayerTokenFolders();
          const tokenRootFolder = getTokenRootFolder();

          let folders = null;
          let playerRootFolder = null;

          if (isDm) {
            const requestedFolders = parseFolderFilters(req.query.folders);
            folders = requestedFolders.length === 0 ? null : requestedFolders.filter(Boolean);
          } else {
            playerRootFolder = resolvePlayerRootFolder(tokenRootFolder);

            if (!playerRootFolder) {
              return res.status(403).json({ message: 'Forbidden' });
            }

            const allowedFolders = filterPlayerAccessibleFolders(
              req.query.folders,
              playerRootFolder,
              tokenRootFolder
            );

            folders = allowedFolders.length > 0 ? allowedFolders : [playerRootFolder];
          }

          let manifest;
          try {
            manifest = await listTokenAssets({
              folders,
              nextCursor:
                typeof req.query.nextCursor === 'string' && req.query.nextCursor.trim() !== ''
                  ? req.query.nextCursor.trim()
                  : null,
            });
          } catch (error) {
            logger.warn('Failed to load token manifest from Cloudinary', {
              campaign: campaignName,
              error: error.message,
            });

            const candidateStatusCodes = [
              error?.status,
              error?.statusCode,
              error?.status_code,
              error?.http_code,
              error?.response?.status,
            ].filter((value) => Number.isInteger(value) && value >= 400 && value < 600);
            const status = candidateStatusCodes.length > 0 ? candidateStatusCodes[0] : 503;

            const detailMessage =
              typeof error?.message === 'string' && error.message.trim() !== ''
                ? error.message.trim()
                : 'An unexpected error occurred while loading token assets.';

            return res.status(status).json({
              message: 'Failed to load token manifest.',
              details: detailMessage,
            });
          }

          res.json({
            ...manifest,
            appliedFolders: Array.isArray(manifest?.appliedFolders)
              ? manifest.appliedFolders
              : Array.isArray(folders)
                ? folders
                : [],
            isDm,
            defaultPlayerFolders: playerFolders,
          });
        } catch (err) {
          next(err);
        }
      }
    );

  // This section will find all of the users characters in a specific campaign.
  campaignRouter.route('/:campaign/:username').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Characters")
        .find({ campaign: req.params.campaign, token: req.params.username })
        .toArray();
      res.json(result);
    } catch (err) {
      next(err);
    }
   });

  // This section will find a specific campaign.
  campaignRouter.route('/:campaign').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .findOne({ campaignName: req.params.campaign });
      res.json(withDefaultCombat(result));
    } catch (err) {
      next(err);
    }
  });

  router.use('/campaigns', campaignRouter);
};
