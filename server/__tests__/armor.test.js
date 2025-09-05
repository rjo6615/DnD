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

describe('Armor API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbo.mockResolvedValue({});
  });

  test('lists all armor', async () => {
    const res = await request(app).get('/armor');
    expect(res.status).toBe(200);
    expect(res.body.padded).toBeDefined();
    expect(res.body.leather).toBeDefined();
  });

  test('fetches a single armor', async () => {
    const res = await request(app).get('/armor/chain-mail');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Chain Mail',
      ac: 16,
      strength: 13,
      stealth: true,
    });
  });

  test('returns 404 for unknown armor', async () => {
    const res = await request(app).get('/armor/unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Armor not found');
  });
});
