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

describe('Accessory routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists SRD accessories', async () => {
    const res = await request(app).get('/accessories');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body['amulet-of-health']).toBeDefined();
    expect(res.body['amulet-of-health'].name).toBe('Amulet of Health');
    expect(Array.isArray(res.body['amulet-of-health'].targetSlots)).toBe(true);
    expect(res.body['amulet-of-health'].targetSlots).toContain('neck');
    expect(res.body['amulet-of-health'].weight).toBe(1);
    expect(res.body['amulet-of-health'].cost).toBe('5000 gp');
    expect(res.body['ring-of-protection'].targetSlots).toEqual(
      expect.arrayContaining(['ringLeft', 'ringRight'])
    );
    expect(res.body['ring-of-protection'].weight).toBe(0);
    expect(res.body['ring-of-protection'].cost).toBe('5000 gp');
  });

  test('provides accessory options metadata', async () => {
    const res = await request(app).get('/accessories/options');

    expect(res.status).toBe(200);
    expect(res.body.categories).toContain('amulet');
    expect(res.body.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'neck' }),
        expect.objectContaining({ key: 'ringLeft' }),
      ])
    );
  });
});

