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

describe('Item routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists all items', async () => {
    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(res.body.torch.name).toBe('Torch');
  });

  test('provides item options', async () => {
    const res = await request(app).get('/items/options');
    expect(res.status).toBe(200);
    expect(res.body.categories).toContain('tool');
  });

  test('fetches item by name', async () => {
    const res = await request(app).get('/items/torch');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Torch');
  });

  test('handles unknown item', async () => {
    const res = await request(app).get('/items/unknown-item');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item not found');
  });
});
