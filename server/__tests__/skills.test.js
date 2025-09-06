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

describe('Skills routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects removal of racial proficiency', async () => {
    const charDoc = {
      race: { skills: { perception: { proficient: true } } },
      skills: { perception: { proficient: true } }
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    const findOneAndUpdate = jest.fn();

    dbo.mockResolvedValue({
      collection: () => ({ findOne, findOneAndUpdate })
    });

    const res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'perception', proficient: false, expertise: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot remove granted proficiency');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('allows two proficiencies in addition to racial proficiency', async () => {
    const charDoc = {
      race: { skills: { perception: { proficient: true } } },
      skills: { perception: { proficient: true } },
      proficiencyPoints: 2,
      occupation: [
        { Level: 1, Occupation: 'Rogue' },
        { Level: 1, Occupation: 'Wizard' }
      ],
      dex: 10,
      int: 10
    };

    const findOne = jest.fn().mockImplementation(() => Promise.resolve({ ...charDoc }));
    const findOneAndUpdate = jest.fn().mockImplementation((id, update) => {
      Object.entries(update.$set || {}).forEach(([key, value]) => {
        if (key.startsWith('skills.')) {
          const skillKey = key.split('.')[1];
          charDoc.skills[skillKey] = value;
        } else {
          charDoc[key] = value;
        }
      });
      return Promise.resolve({ value: { ...charDoc } });
    });

    dbo.mockResolvedValue({
      collection: () => ({ findOne, findOneAndUpdate })
    });

    let res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'stealth', proficient: true, expertise: false });
    expect(res.status).toBe(200);

    res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'arcana', proficient: true, expertise: false });
    expect(res.status).toBe(200);

    res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'athletics', proficient: true, expertise: false });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No proficiency points remaining');
  });

  test('rejects expertise without proficiency', async () => {
    const charDoc = {
      occupation: [{ Level: 1, Occupation: 'Rogue' }],
      skills: {},
      expertisePoints: 2,
    };

    const findOne = jest.fn().mockResolvedValue(charDoc);
    const findOneAndUpdate = jest.fn();

    dbo.mockResolvedValue({
      collection: () => ({ findOne, findOneAndUpdate })
    });

    const res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'stealth', proficient: false, expertise: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Expertise requires proficiency');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('allows expertise when class grants slots', async () => {
    const charDoc = {
      occupation: [{ Level: 1, Occupation: 'Rogue' }],
      skills: { stealth: { proficient: true, expertise: false } },
      expertisePoints: 2,
      dex: 10,
    };

    const findOne = jest.fn().mockImplementation(() => Promise.resolve({ ...charDoc }));
    const findOneAndUpdate = jest.fn().mockImplementation((id, update) => {
      Object.entries(update.$set || {}).forEach(([key, value]) => {
        if (key.startsWith('skills.')) {
          const skillKey = key.split('.')[1];
          charDoc.skills[skillKey] = value;
        } else {
          charDoc[key] = value;
        }
      });
      return Promise.resolve({ value: { ...charDoc } });
    });

    dbo.mockResolvedValue({
      collection: () => ({ findOne, findOneAndUpdate })
    });

    const res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'stealth', proficient: true, expertise: true });
    expect(res.status).toBe(200);
    expect(res.body.expertise).toBe(true);
  });
});

