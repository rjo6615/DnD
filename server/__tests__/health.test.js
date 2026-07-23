process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
const routes = require('../routes');

const app = express();
app.use(express.json());
app.use(routes);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('Health routes validation', () => {
  test('applies character HP deltas and returns the authoritative value', async () => {
    const character = { _id: '507f1f77bcf86cd799439011', campaign: 'Test', health: 20, tempHealth: 15, characterId: 'hero-1' };
    const updateOne = jest.fn().mockImplementation(async (_filter, update) => {
      character.tempHealth = update.$set.tempHealth;
      character.deathState = update.$set.deathState;
      character.hpEventIds = ['damage-1'];
      return { matchedCount: 1 };
    });
    dbo.mockResolvedValue({ collection: () => ({ findOne: async () => character, updateOne }) });

    const res = await request(app)
      .put('/characters/update-temphealth/507f1f77bcf86cd799439011')
      .send({ delta: -6, eventId: 'damage-1' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ previousHp: 15, currentHp: 9, actualHpLost: 6, eventId: 'damage-1' });
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ tempHealth: 15 }),
      expect.objectContaining({ $set: expect.objectContaining({ tempHealth: 9 }) })
    );
  });

  test('long rest atomically restores persisted current HP and is idempotent', async () => {
    const character = { _id: '507f1f77bcf86cd799439011', campaign: 'Test', health: 20, tempHealth: 7, hpEventIds: [] };
    const updateOne = jest.fn().mockImplementation(async (_filter, update) => {
      character.tempHealth = update.$set.tempHealth;
      character.hpEventIds.push('rest-1');
      return { matchedCount: 1 };
    });
    dbo.mockResolvedValue({ collection: () => ({ findOne: async () => character, updateOne }) });

    const first = await request(app).put('/characters/rest/507f1f77bcf86cd799439011')
      .send({ type: 'long', eventId: 'rest-1' });
    const duplicate = await request(app).put('/characters/rest/507f1f77bcf86cd799439011')
      .send({ type: 'long', eventId: 'rest-1' });

    expect(first.body).toMatchObject({ previousHp: 7, currentHp: 20, actualHealing: 13 });
    expect(duplicate.body).toMatchObject({ duplicate: true, currentHp: 20, actualHealing: 0 });
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  test('healing potion consumption and healing share one atomic update', async () => {
    const character = {
      _id: '507f1f77bcf86cd799439011', campaign: 'Test', health: 20, tempHealth: 10,
      hpEventIds: [], item: [{ name: 'potion-healing', displayName: 'Potion of healing' }, { name: 'Torch' }],
    };
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 });
    dbo.mockResolvedValue({ collection: () => ({ findOne: async () => character, updateOne }) });

    const res = await request(app).put('/characters/use-healing-potion/507f1f77bcf86cd799439011')
      .send({ itemKey: 'potion-healing', healingAmount: 7, eventId: 'potion-1' });

    expect(res.body).toMatchObject({ previousHp: 10, currentHp: 17, actualHealing: 7, inventory: [{ name: 'Torch' }] });
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ hpEventIds: { $ne: 'potion-1' } }),
      expect.objectContaining({ $set: expect.objectContaining({ tempHealth: 17, item: [{ name: 'Torch' }] }) })
    );
  });

  test('uses derived max HP and atomically spends a Hit Die on a short rest', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    const character = {
      _id: '507f1f77bcf86cd799439011', campaign: 'Test', health: 10, tempHealth: 8,
      con: 14, occupation: [{ Level: 2, Health: 10 }], hitDiceUsed: 0, hpEventIds: [],
    };
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 });
    dbo.mockResolvedValue({ collection: () => ({ findOne: async () => character, updateOne }) });

    const res = await request(app).put('/characters/rest/507f1f77bcf86cd799439011')
      .send({ type: 'short', eventId: 'short-rest-1' });

    expect(res.body).toMatchObject({ previousHp: 8, currentHp: 11, maxHp: 14, actualHealing: 3, hitDieSpent: true, hitDiceUsed: 1 });
    expect(updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ $set: expect.objectContaining({ tempHealth: 11, hitDiceUsed: 1 }) })
    );
    random.mockRestore();
  });

  test('healing clamps against derived max HP rather than base health', async () => {
    const character = {
      _id: '507f1f77bcf86cd799439011', campaign: 'Test', health: 10, tempHealth: 12,
      con: 14, occupation: [{ Level: 3, Health: 10 }], hpEventIds: [],
    };
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 });
    dbo.mockResolvedValue({ collection: () => ({ findOne: async () => character, updateOne }) });

    const res = await request(app).put('/characters/heal/507f1f77bcf86cd799439011')
      .send({ amount: 20, eventId: 'heal-derived-max' });

    expect(res.body).toMatchObject({ previousHp: 12, currentHp: 16, maxHp: 16, actualHealing: 4 });
  });

  test('update temphealth invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-temphealth/123')
      .send({ tempHealth: 5 });
    expect(res.status).toBe(400);
  });

  test('update temphealth invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-temphealth/507f1f77bcf86cd799439011')
      .send({ tempHealth: 'bad' });
    expect(res.status).toBe(400);
  });

  test('update health invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-health/123')
      .send({ health: 1, str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1, startStatTotal: 1 });
    expect(res.status).toBe(400);
  });

  test('update health invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-health/507f1f77bcf86cd799439011')
      .send({ health: 'bad', str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1, startStatTotal: 1 });
    expect(res.status).toBe(400);
  });
});
