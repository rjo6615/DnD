process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGIN = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
const routes = require('../routes');

const app = express();
app.use(express.json());
app.use(routes);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('Health routes validation', () => {
  test('update temphealth invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-temphealth/123')
      .send({ tempHealth: 5 });
    expect(res.status).toBe(400);
  });

  test('update temphealth invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-temphealth/507f1f77bcf86cd799439011')
      .send({ tempHealth: 'bad' });
    expect(res.status).toBe(400);
  });

  test('update health invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-health/123')
      .send({ health: 1, str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1, startStatTotal: 1 });
    expect(res.status).toBe(400);
  });

  test('update health invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/update-health/507f1f77bcf86cd799439011')
      .send({ health: 'bad', str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1, startStatTotal: 1 });
    expect(res.status).toBe(400);
  });
});
