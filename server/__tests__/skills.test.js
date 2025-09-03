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
      skills: { perception: { proficient: true } },
      allowedSkills: ['perception']
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
    expect(res.body.message).toBe('Cannot remove racial proficiency');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});

