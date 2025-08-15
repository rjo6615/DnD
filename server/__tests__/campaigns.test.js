const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
const campaignsRouter = require('../routes.js');

const app = express();
app.use(express.json());
app.use(campaignsRouter);

describe('Campaign routes', () => {
  test('create campaign success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: (doc, cb) => cb(null, { acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/campaign/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('create campaign failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: (doc, cb) => cb(new Error('db error'))
      })
    });
    const res = await request(app)
      .post('/campaign/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(500);
  });

  test('get campaign by name success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: (query, cb) => cb(null, { campaignName: 'Test', dm: 'DM', players: [] })
      })
    });
    const res = await request(app).get('/campaign/Test');
    expect(res.status).toBe(200);
    expect(res.body.dm).toBe('DM');
  });

  test('get campaign by name failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: (query, cb) => cb(new Error('db error'))
      })
    });
    const res = await request(app).get('/campaign/Test');
    expect(res.status).toBe(500);
  });

  test('get campaigns by dm success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(null, [{ campaignName: 'Test', dm: 'DM' }]) })
      })
    });
    const res = await request(app).get('/campaignsDM/DM');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('get campaigns by dm failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: (cb) => cb(new Error('db error')) })
      })
    });
    const res = await request(app).get('/campaignsDM/DM');
    expect(res.status).toBe(500);
  });

  test('get campaign by dm and name success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: (query, cb) => cb(null, { campaignName: 'Test', dm: 'DM' })
      })
    });
    const res = await request(app).get('/campaignsDM/DM/Test');
    expect(res.status).toBe(200);
    expect(res.body.campaignName).toBe('Test');
  });

  test('get campaign by dm and name failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: (query, cb) => cb(new Error('db error'))
      })
    });
    const res = await request(app).get('/campaignsDM/DM/Test');
    expect(res.status).toBe(500);
  });
});
