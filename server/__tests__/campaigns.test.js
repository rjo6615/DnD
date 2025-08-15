const request = require('supertest');
const express = require('express');

jest.mock('../db/conn', () => ({ getDb: jest.fn() }));
const dbo = require('../db/conn');
const campaignsRouter = require('../routes/campaigns');

const app = express();
app.use(express.json());
app.use(campaignsRouter);

describe('Campaign routes', () => {
  test('create campaign success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        insertOne: async () => ({ acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/campaign/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('create campaign failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        insertOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .post('/campaign/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(500);
  });

  test('get campaign by name success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM', players: [] })
      })
    });
    const res = await request(app).get('/campaign/Test');
    expect(res.status).toBe(200);
    expect(res.body.dm).toBe('DM');
  });

  test('get campaign by name failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        findOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app).get('/campaign/Test');
    expect(res.status).toBe(500);
  });

  test('get campaigns by dm success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ campaignName: 'Test', dm: 'DM' }] })
      })
    });
    const res = await request(app).get('/campaignsDM/DM');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('get campaigns by dm failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaignsDM/DM');
    expect(res.status).toBe(500);
  });

  test('get campaign by dm and name success', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' })
      })
    });
    const res = await request(app).get('/campaignsDM/DM/Test');
    expect(res.status).toBe(200);
    expect(res.body.campaignName).toBe('Test');
  });

  test('get campaign by dm and name failure', async () => {
    dbo.getDb.mockReturnValue({
      collection: () => ({
        findOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app).get('/campaignsDM/DM/Test');
    expect(res.status).toBe(500);
  });
});
