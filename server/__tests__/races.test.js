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

describe('Races API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbo.mockResolvedValue({});
  });

  test('reports darkvision range for orc', async () => {
    const res = await request(app).get('/races/orc');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      darkvisionRange: 120,
    });
  });
});
