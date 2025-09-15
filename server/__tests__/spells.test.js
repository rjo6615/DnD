process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');
const classSpellLists = require('../data/classSpellLists');

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

  test('GET /spells returns all spells and sample fields', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).length).toBeGreaterThanOrEqual(10);
    expect(res.body['cure-wounds'].level).toBe(1);
    expect(res.body.fireball.school).toBe('Evocation');
  });

  test('GET /spells/:name returns spell case-insensitively', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells/WISH');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Wish');
    expect(res.body.level).toBe(9);
  });

  test('GET /spells/:name returns 404 for missing spell', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells/Unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Spell not found');
  });

  test('damaging spells include parsed damage and type fields', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells/fireball');
    expect(res.status).toBe(200);
    expect(res.body.damage).toBe('8d6 fire');
    expect(res.body.damageType).toBe('fire');
  });

  test('upcastable spells include higherLevels field', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells/burning-hands');
    expect(res.status).toBe(200);
    expect(res.body.higherLevels).toMatch(/damage increases/i);
  });

  test('GET /spells?class=bard returns only bard spells', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/spells').query({ class: 'bard' });
    expect(res.status).toBe(200);
    const keys = Object.keys(res.body);
    expect(keys).toEqual(classSpellLists.bard);
    expect(keys).not.toContain('fireball');
  });
});
