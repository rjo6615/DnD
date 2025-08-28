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

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/weapon/add')
        .send({ campaign: 'Camp1', weaponName: 'Sword', enhancement: 'bad' });
      expect(res.status).toBe(400);
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
      expect(res.body.message).toBe('Weapon not found');
    });

    test('update weapon invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/update-weapon/123')
        .send({ weapon: ['Sword'] });
      expect(res.status).toBe(400);
    });

    test('update weapon invalid body', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/update-weapon/507f1f77bcf86cd799439011')
        .send({ weapon: 'Sword' });
      expect(res.status).toBe(400);
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

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/armor/add')
        .send({ campaign: 'Camp1', armorName: 'Plate', armorBonus: 'bad' });
      expect(res.status).toBe(400);
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
      expect(res.body.message).toBe('Armor not found');
    });

    test('update armor invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/update-armor/123')
        .send({ armor: ['Plate'] });
      expect(res.status).toBe(400);
    });

    test('update armor invalid body', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: 'Plate' });
      expect(res.status).toBe(400);
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

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/item/add')
        .send({ campaign: 'Camp1', itemName: 'Potion', str: 'bad' });
      expect(res.status).toBe(400);
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
      expect(res.body.message).toBe('Item not found');
    });

    test('update item invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/update-item/123')
        .send({ item: ['Potion'] });
      expect(res.status).toBe(400);
    });

    test('update item invalid body', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/update-item/507f1f77bcf86cd799439011')
        .send({ item: 'Potion' });
      expect(res.status).toBe(400);
    });
  });
});

