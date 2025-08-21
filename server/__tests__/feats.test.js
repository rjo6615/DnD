process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGIN = 'http://localhost';

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

describe('Feats routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/feat/add', () => {
    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).post('/feat/add').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/feat/add')
        .send({ featName: 'Alertness', appraise: 'bad' });
      expect(res.status).toBe(400);
    });
  });

  describe('/update-feat/:id', () => {
    const id = '507f1f77bcf86cd799439011';

    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).put(`/update-feat/${id}`).send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put(`/update-feat/${id}`)
        .send({ featName: 'Alertness', appraise: 'bad' });
      expect(res.status).toBe(400);
    });
  });
});
