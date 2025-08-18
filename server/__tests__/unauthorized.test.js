const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
dbo.mockResolvedValue({});

const routes = require('../routes');

const app = express();
app.use(express.json());
app.use(routes);

describe('Unauthorized access', () => {
  test('campaign route without token returns 401', async () => {
    const res = await request(app).get('/campaign/Test');
    expect(res.status).toBe(401);
  });

  test('character route without token returns 401', async () => {
    const res = await request(app)
      .post('/character/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(401);
  });
});
