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

describe('Background API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbo.mockResolvedValue({});
  });

  test('fetches a multi-word background', async () => {
    const res = await request(app).get('/backgrounds/folkHero');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Folk Hero',
      skills: {
        animalHandling: { proficient: true },
        survival: { proficient: true },
      },
    });
  });

  test('returns 404 for unknown background', async () => {
    const res = await request(app).get('/backgrounds/unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Background not found');
  });
});
