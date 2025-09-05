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

describe('Armor proficiency routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects removal of granted proficiency', async () => {
    const charDoc = {
      race: { armor: { leather: { proficient: true } } },
      armorProficiencies: { leather: true },
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    const findOneAndUpdate = jest.fn();

    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Characters') {
          return { findOne, findOneAndUpdate };
        }
        if (name === 'Armor') {
          return { find: () => ({ toArray: jest.fn().mockResolvedValue([]) }) };
        }
      },
    });

    const res = await request(app)
      .put('/armor-proficiency/507f1f77bcf86cd799439011')
      .send({ armor: 'leather', proficient: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot remove granted proficiency');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('allows toggling armor proficiency', async () => {
    const charDoc = {
      occupation: [{ armor: { shield: { proficient: false } } }],
      feat: [],
      race: {},
      armorProficiencies: {},
    };

    const updatedDoc = {
      ...charDoc,
      armorProficiencies: { shield: true },
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    const findOneAndUpdate = jest.fn().mockResolvedValue({ value: updatedDoc });

    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Characters') {
          return { findOne, findOneAndUpdate };
        }
        if (name === 'Armor') {
          return { find: () => ({ toArray: jest.fn().mockResolvedValue([]) }) };
        }
      },
    });

    const res = await request(app)
      .put('/armor-proficiency/507f1f77bcf86cd799439011')
      .send({ armor: 'shield', proficient: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ armor: 'shield', proficient: true });
    expect(findOneAndUpdate).toHaveBeenCalled();
  });

  test('returns allowed, granted, and manual proficiencies', async () => {
    const charDoc = {
      occupation: [{ armor: { padded: false } }],
      feat: [],
      race: { armor: { leather: { proficient: true } } },
      armorProficiencies: { padded: true },
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Characters') {
          return { findOne };
        }
        if (name === 'Armor') {
          return { find: () => ({ toArray: jest.fn().mockResolvedValue([]) }) };
        }
      },
    });

    const res = await request(app).get(
      '/armor-proficiency/507f1f77bcf86cd799439011'
    );

    expect(res.status).toBe(200);
    expect(res.body.allowed).toEqual(expect.arrayContaining(['padded', 'leather']));
    expect(res.body.granted).toEqual(expect.arrayContaining(['leather']));
    expect(res.body.proficient).toEqual({ leather: true, padded: true });
  });

  test('expands armor categories', async () => {
    const charDoc = {
      race: { armor: ['light'] },
      armorProficiencies: {},
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Characters') {
          return { findOne };
        }
        if (name === 'Armor') {
          return { find: () => ({ toArray: jest.fn().mockResolvedValue([]) }) };
        }
      },
    });

    const res = await request(app).get(
      '/armor-proficiency/507f1f77bcf86cd799439011'
    );

    expect(res.status).toBe(200);
    expect(res.body.granted).toEqual(
      expect.arrayContaining(['padded', 'leather', 'studded-leather'])
    );
  });
});

