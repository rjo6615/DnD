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

describe('Class features API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbo.mockResolvedValue({});
  });

  test('fetches barbarian level 1 features', async () => {
    const res = await request(app).get('/classes/barbarian/features/1');
    expect(res.status).toBe(200);
    expect(res.body.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Rage' }),
        expect.objectContaining({ name: 'Unarmored Defense' })
      ])
    );
    expect(res.body.spellSlots).toBeUndefined();
  });

  test('fetches cleric level 1 features with spell slots', async () => {
    const res = await request(app).get('/classes/cleric/features/1');
    expect(res.status).toBe(200);
    expect(res.body.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Spellcasting' }),
        expect.objectContaining({ name: 'Divine Domain' })
      ])
    );
    expect(res.body.spellSlots).toEqual({ 1: 2 });
  });

  test('includes pact magic for warlocks', async () => {
    const res = await request(app).get('/classes/warlock/features/2');
    expect(res.status).toBe(200);
    expect(res.body.pactMagic).toEqual({ 1: 2 });
  });
});

