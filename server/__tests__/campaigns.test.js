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
});
