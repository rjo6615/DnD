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

describe('Weapon proficiency routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects removal of granted proficiency', async () => {
    const charDoc = {
      race: { weapons: { dagger: { proficient: true } } },
      weaponProficiencies: { dagger: true },
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    const findOneAndUpdate = jest.fn();

    dbo.mockResolvedValue({
      collection: () => ({ findOne, findOneAndUpdate })
    });

    const res = await request(app)
      .put('/weapon-proficiency/507f1f77bcf86cd799439011')
      .send({ weapon: 'dagger', proficient: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot remove granted proficiency');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('allows toggling weapon proficiency', async () => {
    const charDoc = {
      occupation: [{ weapons: { shortbow: { proficient: false } } }],
      feat: [],
      race: {},
      weaponProficiencies: {},
    };

    const updatedDoc = {
      ...charDoc,
      weaponProficiencies: { shortbow: true },
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    const findOneAndUpdate = jest.fn().mockResolvedValue({ value: updatedDoc });

    dbo.mockResolvedValue({
      collection: () => ({ findOne, findOneAndUpdate })
    });

    const res = await request(app)
      .put('/weapon-proficiency/507f1f77bcf86cd799439011')
      .send({ weapon: 'shortbow', proficient: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ weapon: 'shortbow', proficient: true });
    expect(findOneAndUpdate).toHaveBeenCalled();
  });

  test('returns allowed and proficient weapons', async () => {
    const charDoc = {
      occupation: [{ weapons: { club: false } }],
      feat: [],
      race: { weapons: { dagger: { proficient: true } } },
      weaponProficiencies: { club: true },
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    dbo.mockResolvedValue({ collection: () => ({ findOne }) });

    const res = await request(app).get(
      '/weapon-proficiency/507f1f77bcf86cd799439011'
    );

    expect(res.status).toBe(200);
    expect(res.body.allowed).toEqual(
      expect.arrayContaining(['club', 'dagger'])
    );
    expect(res.body.proficient).toEqual(
      expect.arrayContaining(['club', 'dagger'])
    );
  });
});

