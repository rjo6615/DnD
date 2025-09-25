process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
let mockUser = { username: 'DM' };
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = mockUser;
  next();
});
jest.mock('../utils/socket', () => ({
  emitCombatUpdate: jest.fn(),
}));
jest.mock('../utils/dnd5eApi', () => ({
  getMonsterByIndex: jest.fn(),
}));
jest.mock('../utils/monsters', () => ({
  buildEnemyRecord: jest.fn(),
}));
const { emitCombatUpdate } = require('../utils/socket');
const { getMonsterByIndex } = require('../utils/dnd5eApi');
const { buildEnemyRecord } = require('../utils/monsters');
const registerCampaignRoutes = require('../routes/campaigns');

const app = express();
app.use(express.json());
const router = express.Router();
router.use(async (req, res, next) => {
  try {
    req.db = await dbo();
    next();
  } catch (err) {
    next(err);
  }
});
registerCampaignRoutes(router);
app.use(router);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('Campaign routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbo.mockReset();
    getMonsterByIndex.mockReset();
    buildEnemyRecord.mockReset();
    mockUser = { username: 'DM' };
  });

  test('create campaign success', async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne,
      }),
    });
    const res = await request(app)
      .post('/campaigns/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [],
        enemies: [],
        combat: { participants: [], activeTurn: null },
      })
    );
  });

  test('create campaign failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .post('/campaigns/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal Server Error');
  });

  test('get campaign by name success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM', players: [] })
      })
    });
    const res = await request(app).get('/campaigns/Test');
    expect(res.status).toBe(200);
    expect(res.body.dm).toBe('DM');
    expect(res.body.combat).toEqual({ participants: [], activeTurn: null });
  });

  test('get campaign by name failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app).get('/campaigns/Test');
    expect(res.status).toBe(500);
  });

  test('get campaigns by dm success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ campaignName: 'Test', dm: 'DM' }] })
      })
    });
    const res = await request(app).get('/campaigns/dm/DM');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].combat).toEqual({ participants: [], activeTurn: null });
  });

  test('get campaigns by dm failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaigns/dm/DM');
    expect(res.status).toBe(500);
  });

  test('get campaign by dm and name success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' })
      })
    });
    const res = await request(app).get('/campaigns/dm/DM/Test');
    expect(res.status).toBe(200);
    expect(res.body.campaignName).toBe('Test');
    expect(res.body.combat).toEqual({ participants: [], activeTurn: null });
  });

  test('get campaign by dm and name failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app).get('/campaigns/dm/DM/Test');
    expect(res.status).toBe(500);
  });

  test('get combat state success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          campaignName: 'Test',
          dm: 'DM',
          combat: {
            participants: [
              { characterId: 'char1', initiative: 15 },
              { characterId: 'char2', initiative: 12 },
            ],
            activeTurn: 1,
          },
        }),
      }),
    });

    const res = await request(app).get('/campaigns/Test/combat');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      participants: [
        { characterId: 'char1', initiative: 15 },
        { characterId: 'char2', initiative: 12 },
      ],
      activeTurn: 1,
    });
  });

  test('get combat state populates enemy display names', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          campaignName: 'Test',
          dm: 'DM',
          combat: {
            participants: [{ characterId: 'enemy-1', initiative: 8 }],
            activeTurn: 0,
          },
          enemies: [{ enemyId: 'enemy-1', name: 'Goblin' }],
        }),
      }),
    });

    const res = await request(app).get('/campaigns/Test/combat');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      participants: [
        { characterId: 'enemy-1', initiative: 8, displayName: 'Goblin' },
      ],
      activeTurn: 0,
    });
  });

  test('get combat state not found', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => null,
      }),
    });

    const res = await request(app).get('/campaigns/Unknown/combat');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Campaign not found');
  });

  test('update combat success', async () => {
    const findOne = jest.fn().mockResolvedValue({ campaignName: 'Test', dm: 'DM' });
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    dbo.mockResolvedValue({
      collection: () => ({
        findOne,
        updateOne,
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/combat')
      .send({
        participants: [
          { characterId: 'char1', initiative: 15 },
          { characterId: 'char2', initiative: 12 },
        ],
        activeTurn: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      participants: [
        { characterId: 'char1', initiative: 15 },
        { characterId: 'char2', initiative: 12 },
      ],
      activeTurn: 0,
    });
    expect(updateOne).toHaveBeenCalledWith(
      { campaignName: 'Test' },
      {
        $set: {
          combat: {
            participants: [
              { characterId: 'char1', initiative: 15 },
              { characterId: 'char2', initiative: 12 },
            ],
            activeTurn: 0,
          },
        },
      }
    );
    expect(emitCombatUpdate).toHaveBeenCalledWith('Test', {
      participants: [
        { characterId: 'char1', initiative: 15 },
        { characterId: 'char2', initiative: 12 },
      ],
      activeTurn: 0,
    });
  });

  test('update combat forbidden for non-DM', async () => {
    mockUser = { username: 'NotDM' };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' }),
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/combat')
      .send({ participants: [], activeTurn: null });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  test('update combat validation failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' }),
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/combat')
      .send({ participants: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].param).toBe('participants');
  });

  test('get enemies success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', enemies: [{ enemyId: 'enemy-1', name: 'Goblin' }] }),
      }),
    });

    const res = await request(app).get('/campaigns/Test/enemies');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ enemyId: 'enemy-1', name: 'Goblin' }]);
  });

  test('add enemy success', async () => {
    getMonsterByIndex.mockResolvedValue({ index: 'goblin' });
    buildEnemyRecord.mockImplementation((monster, enemyId, providedName) => ({ enemyId, name: 'Goblin', providedName }));
    const findOneAndUpdate = jest.fn().mockResolvedValue({ value: { campaignName: 'Test' } });
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate,
      }),
    });

    const res = await request(app)
      .post('/campaigns/Test/enemies')
      .send({ index: 'goblin' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Goblin');
    expect(typeof res.body.enemyId).toBe('string');
    expect(getMonsterByIndex).toHaveBeenCalledWith('goblin');
    expect(buildEnemyRecord).toHaveBeenCalledWith({ index: 'goblin' }, res.body.enemyId, undefined);
  });

  test('delete enemy success', async () => {
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const campaign = {
      campaignName: 'Test',
      enemies: [{ enemyId: 'enemy-1', name: 'Goblin' }],
      combat: {
        participants: [
          { characterId: 'enemy-1', initiative: 14 },
          { characterId: 'char-1', initiative: 12 },
        ],
        activeTurn: 0,
      },
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => campaign,
        updateOne,
      }),
    });

    const res = await request(app).delete('/campaigns/Test/enemies/enemy-1');
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalledWith(
      { campaignName: 'Test' },
      {
        $set: {
          enemies: [],
          combat: { participants: [{ characterId: 'char-1', initiative: 12 }], activeTurn: 0 },
        },
      }
    );
    expect(emitCombatUpdate).toHaveBeenCalledWith('Test', {
      participants: [{ characterId: 'char-1', initiative: 12 }],
      activeTurn: 0,
    });
    expect(res.body.success).toBe(true);
  });

});
