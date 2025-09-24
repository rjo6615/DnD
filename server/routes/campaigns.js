const { param, body } = require('express-validator');
const express = require('express');
const { randomUUID } = require('crypto');
const { getMonsterByIndex } = require('../utils/dnd5eApi');
const { buildEnemyRecord } = require('../utils/monsters');
const authenticateToken = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');
const logger = require('../utils/logger');
const { emitCombatUpdate } = require('../utils/socket');

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

  const sanitizeParticipants = (participants) => {
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

        return {
          characterId: participant.characterId.trim(),
          initiative,
        };
      })
      .filter(Boolean);
  };

  const withDefaultCombat = (campaign) => {
    if (!campaign) {
      return campaign;
    }

    const participants = sanitizeParticipants(campaign.combat?.participants);
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

    // This section will get a list of all the campaigns.
  campaignRouter.route('/player/:player').get(async (req, res, next) => {
    try {
      const db_connect = req.db;
      const result = await db_connect
        .collection("Campaigns")
        .find({ players: { $in: [req.params.player] } })
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
        .find({ dm: req.params.DM })
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

  // This section will create a new campaign.
  campaignRouter.route('/add').post(async (req, response, next) => {
    const db_connect = req.db;
    const myobj = {
      campaignName: req.body.campaignName,
      gameMode: req.body.gameMode,
      dm: req.body.dm,
      players: Array.isArray(req.body.players) ? req.body.players : [],
      combat: createDefaultCombatState(),
      enemies: [],
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
      ],
      handleValidationErrors,
      async (req, res, next) => {
        const campaignName = req.params.campaign;
        const { index, name } = req.body;

        try {
          const monster = await getMonsterByIndex(index);
          const enemyId = generateEnemyId();
          const enemyRecord = buildEnemyRecord(monster, enemyId, name);

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
          const participants = sanitizeParticipants(campaign.combat?.participants).filter(
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

          emitCombatUpdate(campaignName, combatState);

          res.json({ success: true, enemies: updatedEnemies, combat: combatState });
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

          if (!req.user || campaign.dm !== req.user.username) {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const participants = sanitizeParticipants(req.body.participants);

          if (participants.length !== req.body.participants.length) {
            return res
              .status(400)
              .json({ errors: [{ msg: 'participants contain invalid entries', param: 'participants' }] });
          }

          const activeTurn =
            req.body.activeTurn === null || req.body.activeTurn === undefined
              ? null
              : req.body.activeTurn;

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

          emitCombatUpdate(req.params.campaign, combatState);

          res.json(combatState);
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
