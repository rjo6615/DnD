const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
const charactersRouter = require('../routes');

const app = express();
app.use(express.json());
app.use(charactersRouter);

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
});
