process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
const charactersRouter = require('../routes');

const app = express();
app.use(express.json());
app.use(charactersRouter);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('Character routes', () => {
  test('add character success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => ({ acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/character/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add character with array fields', async () => {
    let captured;
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async (doc) => {
          captured = doc;
          return { acknowledged: true };
        }
      })
    });
    const payload = {
      token: 'alice',
      characterName: 'Hero',
      campaign: 'Camp1',
      occupation: [{ Level: '1', Name: 'Scout' }],
      feat: ['Power Attack'],
      weapon: ['Sword'],
      armor: ['Plate'],
      item: ['Potion'],
      newSkill: ['Stealth']
    };
    const res = await request(app)
      .post('/character/add')
      .send(payload);
    expect(res.status).toBe(200);
    expect(captured).toMatchObject({
      ...payload,
      occupation: [{ Level: 1, Name: 'Scout' }]
    });
    expect(Array.isArray(captured.feat)).toBe(true);
    expect(Array.isArray(captured.weapon)).toBe(true);
  });

  test('add character db failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .post('/character/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(500);
  });

  test('add character validation failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => ({ acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/character/add')
      .send({ token: 'alice' });
    expect(res.status).toBe(400);
  });

  test('get characters for campaign and user success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ token: 'alice', campaign: 'Camp1' }] })
      })
    });
    const res = await request(app).get('/campaign/Camp1/alice');
    expect(res.status).toBe(200);
    expect(res.body[0].token).toBe('alice');
  });

  test('get characters for campaign and user failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaign/Camp1/alice');
    expect(res.status).toBe(500);
  });

  test('get all characters for campaign success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [
          { token: 'alice', campaign: 'Camp1' },
          { token: 'bob', campaign: 'Camp1' }
        ] })
      })
    });
    const res = await request(app).get('/campaign/Camp1/characters');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('get all characters for campaign failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaign/Camp1/characters');
    expect(res.status).toBe(500);
  });

  test('get character preserves array fields', async () => {
    const character = {
      token: 'alice',
      campaign: 'Camp1',
      occupation: [{ Level: 1, Name: 'Scout' }],
      feat: ['Power Attack'],
      weapon: ['Sword'],
      armor: ['Plate'],
      item: ['Potion'],
      newSkill: ['Stealth']
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => character
      })
    });
    const res = await request(app).get('/characters/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.occupation).toEqual(character.occupation);
    expect(Array.isArray(res.body.feat)).toBe(true);
    expect(Array.isArray(res.body.weapon)).toBe(true);
  });

  test('get weapons success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ weaponName: 'Sword' }] })
      })
    });
    const res = await request(app).get('/weapons/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].weaponName).toBe('Sword');
  });

  test('get weapons failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/weapons/Camp1');
    expect(res.status).toBe(500);
  });

  test('get armor success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ armorName: 'Plate' }] })
      })
    });
    const res = await request(app).get('/armor/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].armorName).toBe('Plate');
  });

  test('get armor failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/armor/Camp1');
    expect(res.status).toBe(500);
  });

  test('get items success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ itemName: 'Potion' }] })
      })
    });
    const res = await request(app).get('/items/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].itemName).toBe('Potion');
  });

  test('get items failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/items/Camp1');
    expect(res.status).toBe(500);
  });

  test('get feats success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ feat: 'Power Attack' }] })
      })
    });
    const res = await request(app).get('/feats');
    expect(res.status).toBe(200);
    expect(res.body[0].feat).toBe('Power Attack');
  });

  test('get feats failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/feats');
    expect(res.status).toBe(500);
  });

  test('get occupations success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ name: 'Soldier' }] })
      })
    });
    const res = await request(app).get('/occupations');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Soldier');
  });

  test('get occupations failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/occupations');
    expect(res.status).toBe(500);
  });

  test('update skills success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate: async () => ({ value: { appraise: 1 } })
      })
    });
    const res = await request(app)
      .put('/update-skills/507f1f77bcf86cd799439011')
      .send({ appraise: 1 });
    expect(res.status).toBe(200);
    expect(res.body.appraise).toBe(1);
  });

  test('update skills failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .put('/update-skills/507f1f77bcf86cd799439011')
      .send({ appraise: 1 });
    expect(res.status).toBe(500);
  });

  test('update added skills success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate: async () => ({ value: { newSkill: [['Skill', 1]] } })
      })
    });
    const res = await request(app)
      .put('/updated-add-skills/507f1f77bcf86cd799439011')
      .send({ newSkill: [['Skill', 1]] });
    expect(res.status).toBe(200);
    expect(res.body.newSkill).toEqual([['Skill', 1]]);
  });

  test('update added skills failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .put('/updated-add-skills/507f1f77bcf86cd799439011')
      .send({ newSkill: [['Skill', 1]] });
    expect(res.status).toBe(500);
  });

  test('add weapon success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/weapon/add')
      .send({ campaign: 'Camp1', weaponName: 'Sword' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add weapon failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/weapon/add')
      .send({ campaign: 'Camp1', weaponName: 'Sword' });
    expect(res.status).toBe(500);
  });

  test('add armor success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add armor failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(500);
  });

  test('add item success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add item failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(500);
  });

  test('get character invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/characters/123');
    expect(res.status).toBe(400);
  });

  test('delete character invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).delete('/delete-character/123');
    expect(res.status).toBe(400);
  });

  test('update level invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-level/123')
      .send({ level: 1, health: 1 });
    expect(res.status).toBe(400);
  });

  test('update level invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-level/507f1f77bcf86cd799439011')
      .send({ level: 'one', health: 1 });
    expect(res.status).toBe(400);
  });

  test('update dice color invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-dice-color/123')
      .send({ diceColor: 'blue' });
    expect(res.status).toBe(400);
  });

  test('update dice color invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-dice-color/507f1f77bcf86cd799439011')
      .send({ diceColor: 5 });
    expect(res.status).toBe(400);
  });

  test('update feats success', async () => {
    let captured;
    dbo.mockResolvedValue({
      collection: () => ({
        updateOne: async (filter, update) => {
          captured = { filter, update };
          return { modifiedCount: 1 };
        }
      })
    });
    const res = await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: ['Power Attack', 'Cleave'] });
    expect(res.status).toBe(200);
    expect(captured.update.$push.feat.$each).toEqual(['Power Attack', 'Cleave']);
  });

  test('append feats across requests', async () => {
    const character = { feat: [] };
    dbo.mockResolvedValue({
      collection: () => ({
        updateOne: async (filter, update) => {
          character.feat.push(...update.$push.feat.$each);
          return { modifiedCount: 1 };
        },
        findOne: async () => character
      })
    });

    await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: ['Power Attack'] });

    await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: ['Cleave'] });

    const res = await request(app).get('/characters/507f1f77bcf86cd799439011');
    expect(res.body.feat).toEqual(['Power Attack', 'Cleave']);
  });

  test('update feats invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: 'Power Attack' });
    expect(res.status).toBe(400);
  });
});
