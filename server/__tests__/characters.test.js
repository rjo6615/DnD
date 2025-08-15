const request = require('supertest');
const express = require('express');

jest.mock('../db/conn', () => ({ getDb: jest.fn() }));
const dbo = require('../db/conn');
const charactersRouter = require('../routes/characters');

const app = express();
app.use(express.json());
app.use(charactersRouter);

describe('Character routes', () => {
  test('add character success', async () => {
    dbo.getDb.mockReturnValue({
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

  test('add character failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        insertOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .post('/character/add')
      .send({ token: 'alice' });
    expect(res.status).toBe(500);
  });

  test('get characters for campaign and user success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ token: 'alice', campaign: 'Camp1' }] })
      })
    });
    const res = await request(app).get('/campaign/Camp1/alice');
    expect(res.status).toBe(200);
    expect(res.body[0].token).toBe('alice');
  });

  test('get characters for campaign and user failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaign/Camp1/alice');
    expect(res.status).toBe(500);
  });

  test('get weapons success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ weaponName: 'Sword' }] })
      })
    });
    const res = await request(app).get('/weapons/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].weaponName).toBe('Sword');
  });

  test('get weapons failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/weapons/Camp1');
    expect(res.status).toBe(500);
  });

  test('get armor success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ armorName: 'Plate' }] })
      })
    });
    const res = await request(app).get('/armor/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].armorName).toBe('Plate');
  });

  test('get armor failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/armor/Camp1');
    expect(res.status).toBe(500);
  });

  test('get items success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ itemName: 'Potion' }] })
      })
    });
    const res = await request(app).get('/items/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].itemName).toBe('Potion');
  });

  test('get items failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/items/Camp1');
    expect(res.status).toBe(500);
  });

  test('get feats success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ feat: 'Power Attack' }] })
      })
    });
    const res = await request(app).get('/feats');
    expect(res.status).toBe(200);
    expect(res.body[0].feat).toBe('Power Attack');
  });

  test('get feats failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/feats');
    expect(res.status).toBe(500);
  });

  test('get occupations success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ name: 'Soldier' }] })
      })
    });
    const res = await request(app).get('/occupations');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Soldier');
  });

  test('get occupations failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/occupations');
    expect(res.status).toBe(500);
  });

  test('update skills success', async () => {
    dbo.getDb.mockReturnValue({
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
    dbo.getDb.mockReturnValue({
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
    dbo.getDb.mockReturnValue({
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
    dbo.getDb.mockReturnValue({
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
    dbo.getDb.mockReturnValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/weapon/add')
      .send({ campaign: 'Camp1', weaponName: 'Sword' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add weapon failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/weapon/add')
      .send({ campaign: 'Camp1', weaponName: 'Sword' });
    expect(res.status).toBe(500);
  });

  test('add armor success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add armor failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(500);
  });

  test('add item success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add item failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(500);
  });
});
