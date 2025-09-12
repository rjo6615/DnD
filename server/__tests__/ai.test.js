process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';
process.env.OPENAI_API_KEY = 'test';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());

jest.mock('openai', () => {
  class OpenAI {
    constructor() {
      this.responses = { parse: (...a) => OpenAI.__parse(...a) };
    }
  }
  OpenAI.__parse = jest.fn();
  return OpenAI;
});
jest.mock('openai/helpers/zod', () => ({ zodTextFormat: () => ({}) }));

jest.mock('zod', () => {
  function makeSchema(check) {
    return {
      check,
      optional() {
        return makeSchema((v) => v === undefined || check(v));
      },
    };
  }
  const z = {
    string: () => makeSchema((v) => typeof v === 'string'),
    number: () => makeSchema((v) => typeof v === 'number'),
    boolean: () => makeSchema((v) => typeof v === 'boolean'),
    enum: (vals) => makeSchema((v) => vals.includes(v)),
    array: (s) => makeSchema((v) => Array.isArray(v) && v.every(s.check)),
    object: (shape) => {
      const schema = makeSchema((v) => v && typeof v === 'object');
      schema.safeParse = (d) => {
        for (const k in shape) {
          if (!shape[k].check(d[k])) {
            return { success: false, error: { message: 'Invalid' } };
          }
        }
        return { success: true, data: d };
      };
      schema.catchall = (s) => {
        const cs = makeSchema(
          (v) => v && typeof v === 'object' && Object.values(v).every(s.check)
        );
        cs.safeParse = (d) => {
          for (const val of Object.values(d || {})) {
            if (!s.check(val)) {
              return { success: false, error: { message: 'Invalid' } };
            }
          }
          return { success: true, data: d };
        };
        cs.catchall = () => cs;
        return cs;
      };
      return schema;
    },
  };
  return { z };
});

const OpenAI = require('openai');
const mockParse = OpenAI.__parse;

const routes = require('../routes');

const app = express();
app.use(express.json());
app.use(routes);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('AI item route', () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  test('returns item with stat and skill bonuses', async () => {
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'AI Item',
                category: 'adventuring gear',
                statBonuses: { str: 2 },
                skillBonuses: { acrobatics: 3 },
              },
            },
          ],
        },
      ],
    });

    const res = await request(app).post('/ai/item').send({ prompt: 'make item' });
    expect(res.status).toBe(200);
    expect(res.body.statBonuses).toEqual({ str: 2 });
    expect(res.body.skillBonuses).toEqual({ acrobatics: 3 });
  });

  test('extracts bonuses from prompt when AI omits them', async () => {
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'Ring',
                category: 'adventuring gear',
              },
            },
          ],
        },
      ],
    });

    const res = await request(app)
      .post('/ai/item')
      .send({ prompt: 'ring that grants +2 Strength and +1 Stealth' });
    expect(res.status).toBe(200);
    expect(res.body.statBonuses).toEqual({ str: 2 });
    expect(res.body.skillBonuses).toEqual({ stealth: 1 });
  });

  test('validates incorrect bonus data', async () => {
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'Bad Item',
                category: 'adventuring gear',
                statBonuses: { str: 'high' },
              },
            },
          ],
        },
      ],
    });

    const res = await request(app).post('/ai/item').send({ prompt: 'bad item' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBeDefined();
  });
});

