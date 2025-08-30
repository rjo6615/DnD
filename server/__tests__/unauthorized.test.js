process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

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
    const res = await request(app).get('/campaigns/Test');
    expect(res.status).toBe(401);
  });

  test('character route without token returns 401', async () => {
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(401);
  });
});
