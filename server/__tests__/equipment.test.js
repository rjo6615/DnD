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
  res.status(500).json({ message: err.message });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Equipment routes', () => {
  describe('/weapon/add', () => {
    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).post('/weapon/add').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('insert success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
      });
      const res = await request(app)
        .post('/weapon/add')
        .send({ campaign: 'Camp1', weaponName: 'Sword' });
      expect(res.status).toBe(200);
      expect(res.body.acknowledged).toBe(true);
    });
  });

  describe('update-weapon', () => {
    test('update success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 1 }) })
      });
      const res = await request(app)
        .put('/update-weapon/507f1f77bcf86cd799439011')
        .send({ weapon: ['Sword'] });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Weapon updated');
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) })
      });
      const res = await request(app)
        .put('/update-weapon/507f1f77bcf86cd799439011')
        .send({ weapon: ['Sword'] });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Weapon not found');
    });
  });

  describe('/armor/add', () => {
    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).post('/armor/add').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('insert success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
      });
      const res = await request(app)
        .post('/armor/add')
        .send({ campaign: 'Camp1', armorName: 'Plate' });
      expect(res.status).toBe(200);
      expect(res.body.acknowledged).toBe(true);
    });
  });

  describe('update-armor', () => {
    test('update success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 1 }) })
      });
      const res = await request(app)
        .put('/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: ['Plate'] });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Armor updated');
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) })
      });
      const res = await request(app)
        .put('/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: ['Plate'] });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Armor not found');
    });
  });

  describe('/item/add', () => {
    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).post('/item/add').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('insert success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
      });
      const res = await request(app)
        .post('/item/add')
        .send({ campaign: 'Camp1', itemName: 'Potion' });
      expect(res.status).toBe(200);
      expect(res.body.acknowledged).toBe(true);
    });
  });

  describe('update-item', () => {
    test('update success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 1 }) })
      });
      const res = await request(app)
        .put('/update-item/507f1f77bcf86cd799439011')
        .send({ item: ['Potion'] });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Item updated');
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) })
      });
      const res = await request(app)
        .put('/update-item/507f1f77bcf86cd799439011')
        .send({ item: ['Potion'] });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Item not found');
    });
  });
});

