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
});
