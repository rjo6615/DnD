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

  test('exposes tiefling fiendish legacy structure', async () => {
    const res = await request(app).get('/races/tiefling');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      creatureType: 'Humanoid',
      darkvisionRange: 60,
    });

    const { fiendishLegacies } = res.body;
    expect(fiendishLegacies).toBeDefined();
    expect(fiendishLegacies.abyssal).toBeDefined();
    expect(fiendishLegacies.chthonic).toBeDefined();
    expect(fiendishLegacies.infernal).toBeDefined();

    Object.values(fiendishLegacies).forEach((legacy) => {
      expect(legacy.resistance).toBeDefined();
      expect(legacy.spellcastingAbilities).toEqual(
        expect.arrayContaining(['Intelligence', 'Wisdom', 'Charisma'])
      );
      expect(legacy.spells).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ usage: 'At will' }),
          expect.objectContaining({ usage: '1/long rest' }),
        ])
      );
    });

    expect(fiendishLegacies.abyssal.spells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Poison Spray', unlockedAtLevel: 1 }),
        expect.objectContaining({ name: 'Ray of Sickness', unlockedAtLevel: 3 }),
        expect.objectContaining({ name: 'Hold Person', unlockedAtLevel: 5 }),
      ])
    );
    expect(fiendishLegacies.chthonic.spells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Chill Touch', unlockedAtLevel: 1 }),
        expect.objectContaining({ name: 'False Life', unlockedAtLevel: 3 }),
        expect.objectContaining({ name: 'Ray of Enfeeblement', unlockedAtLevel: 5 }),
      ])
    );
    expect(fiendishLegacies.infernal.spells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Fire Bolt', unlockedAtLevel: 1 }),
        expect.objectContaining({ name: 'Hellish Rebuke', unlockedAtLevel: 3 }),
        expect.objectContaining({ name: 'Darkness', unlockedAtLevel: 5 }),
      ])
    );
  });
});
