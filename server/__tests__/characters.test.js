const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
const campaignsRouter = require('../routes/campaigns');
const charactersRouter = require('../routes/characters');

const app = express();
app.use(express.json());
app.use(async (req, res, next) => {
  req.db = await dbo();
  next();
});
app.use('/campaigns', campaignsRouter);
app.use('/characters', charactersRouter);

describe('Character routes', () => {
  test('add character success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: (doc, cb) => cb(null, { acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add character with array fields', async () => {
    let captured;
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: (doc, cb) => {
          captured = doc;
          cb(null, { acknowledged: true });
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
      .post('/characters/add')
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
        insertOne: (doc, cb) => cb(new Error('db error'))
      })
    });
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(500);
  });

  test('add character validation failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: (doc, cb) => cb(null, { acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice' });
    expect(res.status).toBe(400);
  });

  test('get characters for campaign and user success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(null, [{ token: 'alice', campaign: 'Camp1' }]) })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/alice');
    expect(res.status).toBe(200);
    expect(res.body[0].token).toBe('alice');
  });

  test('get characters for campaign and user failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(new Error('db error')) })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/alice');
    expect(res.status).toBe(500);
  });

  test('get all characters for campaign success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(null, [
          { token: 'alice', campaign: 'Camp1' },
          { token: 'bob', campaign: 'Camp1' }
        ]) })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/characters');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('get all characters for campaign failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(new Error('db error')) })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/characters');
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
        findOne: (query, cb) => cb(null, character)
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
        find: () => ({ toArray: (cb) => cb(null, [{ weaponName: 'Sword' }]) })
      })
    });
    const res = await request(app).get('/characters/weapons/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].weaponName).toBe('Sword');
  });

  test('get weapons failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(new Error('db error')) })
      })
    });
    const res = await request(app).get('/characters/weapons/Camp1');
    expect(res.status).toBe(500);
  });

  test('get armor success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(null, [{ armorName: 'Plate' }]) })
      })
    });
    const res = await request(app).get('/characters/armor/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].armorName).toBe('Plate');
  });

  test('get armor failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(new Error('db error')) })
      })
    });
    const res = await request(app).get('/characters/armor/Camp1');
    expect(res.status).toBe(500);
  });

  test('get items success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(null, [{ itemName: 'Potion' }]) })
      })
    });
    const res = await request(app).get('/characters/items/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].itemName).toBe('Potion');
  });

  test('get items failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(new Error('db error')) })
      })
    });
    const res = await request(app).get('/characters/items/Camp1');
    expect(res.status).toBe(500);
  });

  test('add weapon success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: (doc, cb) => cb(null, { acknowledged: true }) })
    });
    const res = await request(app)
      .post('/characters/weapon/add')
      .send({ campaign: 'Camp1', weaponName: 'Sword' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add weapon failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: (doc, cb) => cb(new Error('db error')) })
    });
    const res = await request(app)
      .post('/characters/weapon/add')
      .send({ campaign: 'Camp1', weaponName: 'Sword' });
    expect(res.status).toBe(500);
  });

  test('add armor success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: (doc, cb) => cb(null, { acknowledged: true }) })
    });
    const res = await request(app)
      .post('/characters/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add armor failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: (doc, cb) => cb(new Error('db error')) })
    });
    const res = await request(app)
      .post('/characters/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(500);
  });

  test('add item success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: (doc, cb) => cb(null, { acknowledged: true }) })
    });
    const res = await request(app)
      .post('/characters/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add item failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: (doc, cb) => cb(new Error('db error')) })
    });
    const res = await request(app)
      .post('/characters/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(500);
  });
});
