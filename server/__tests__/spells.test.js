process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

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

describe('Spells routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /spells returns all spells', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells');
    expect(res.status).toBe(200);
    expect(res.body.fireball.name).toBe('Fireball');
  });

  test('GET /spells/:name returns spell case-insensitively', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells/Fireball');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Fireball');
  });

  test('GET /spells/:name returns 404 for missing spell', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells/Unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Spell not found');
  });
});
