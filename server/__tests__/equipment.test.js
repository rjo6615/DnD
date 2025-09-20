process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
const routes = require('../routes');
const { EQUIPMENT_SLOT_KEYS } = require('../constants/equipmentSlots');

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
      const res = await request(app).post('/equipment/weapon/add').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('insert success', async () => {
      const insertedId = '507f1f77bcf86cd799439012';
      const payload = {
        campaign: 'Camp1',
        name: 'Sword',
        type: 'quarterstaff',
        category: 'Martial',
        damage: '1d8',
        properties: ['versatile'],
        weight: 6,
        cost: 10,
      };
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ insertedId }) })
      });
      const res = await request(app)
        .post('/equipment/weapon/add')
        .send({ ...payload, type: 'Quarterstaff' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ _id: insertedId, ...payload });
    });

    test('invalid properties type', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/equipment/weapon/add')
        .send({
          campaign: 'Camp1',
          name: 'Sword',
          category: 'Martial',
          damage: '1d8',
          properties: 'bad',
        });
      expect(res.status).toBe(400);
    });

    test('invalid weight type', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/equipment/weapon/add')
        .send({
          campaign: 'Camp1',
          name: 'Sword',
          category: 'Martial',
          damage: '1d8',
          weight: 'heavy',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('update-weapon', () => {
    test('update success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 1 }) })
      });
      const res = await request(app)
        .put('/equipment/update-weapon/507f1f77bcf86cd799439011')
        .send({ weapon: ['Sword'] });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Weapon updated');
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) })
      });
      const res = await request(app)
        .put('/equipment/update-weapon/507f1f77bcf86cd799439011')
        .send({ weapon: ['Sword'] });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Weapon not found');
    });

    test('update weapon invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-weapon/123')
        .send({ weapon: ['Sword'] });
      expect(res.status).toBe(400);
    });

    test('update weapon invalid body', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-weapon/507f1f77bcf86cd799439011')
        .send({ weapon: 'Sword' });
      expect(res.status).toBe(400);
    });
  });

  describe('delete weapon', () => {
    test('delete success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ deleteOne: async () => ({ acknowledged: true, deletedCount: 1 }) })
      });
      const res = await request(app).delete('/equipment/weapon/507f1f77bcf86cd799439011');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ acknowledged: true });
    });

    test('delete weapon invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).delete('/equipment/weapon/123');
      expect(res.status).toBe(400);
    });

    test('delete weapon not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ deleteOne: async () => ({ acknowledged: true, deletedCount: 0 }) })
      });
      const res = await request(app).delete('/equipment/weapon/507f1f77bcf86cd799439011');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Weapon not found');
    });
  });

  describe('/armor/add', () => {
    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).post('/equipment/armor/add').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('insert success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ insertedId: 'abc123' }) })
      });
      const payload = {
        campaign: 'Camp1',
        armorName: 'Plate',
        type: 'heavy',
        category: 'martial',
        strength: 15,
        stealth: true,
        weight: 65,
        cost: '1500 gp',
      };
      const res = await request(app)
        .post('/equipment/armor/add')
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ _id: 'abc123', ...payload });
    });

    test('blank numeric fields allowed', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ insertedId: 'def456' }) })
      });
      const res = await request(app)
        .post('/equipment/armor/add')
        .send({
          campaign: 'Camp1',
          armorName: 'Leather',
          armorBonus: '',
          maxDex: '',
        });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ _id: 'def456', campaign: 'Camp1', armorName: 'Leather' });
    });

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/equipment/armor/add')
        .send({
          campaign: 'Camp1',
          armorName: 'Plate',
          armorBonus: 'bad',
          strength: 'bad',
          stealth: 'maybe',
          weight: 'bad',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('update-armor', () => {
    const buildDb = (str, armorStrength, updateResult = { matchedCount: 1 }) => ({
      collection: (name) => {
        if (name === 'Characters') {
          return {
            findOne: async () => ({ str, campaign: 'Camp1' }),
            updateOne: async () => updateResult,
          };
        }
        if (name === 'Armor') {
          return {
            find: () => ({
              toArray: async () => [{ armorName: 'Test Armor', strength: armorStrength }],
            }),
          };
        }
        return {};
      },
    });

    test('accepts armor when strength sufficient', async () => {
      dbo.mockResolvedValue(buildDb(12, 10));
      const res = await request(app)
        .put('/equipment/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: ['Test Armor'] });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Armor updated');
    });

    test('rejects armor requiring higher strength', async () => {
      dbo.mockResolvedValue(buildDb(8, 10));
      const res = await request(app)
        .put('/equipment/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: ['Test Armor'] });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Test Armor requires strength 10');
    });

    test('update not found', async () => {
      const connection = {
        collection: (name) => {
          if (name === 'Characters') {
            return {
              findOne: async () => ({ str: 16, campaign: 'Camp1' }),
              updateOne: async () => ({ matchedCount: 0 }),
            };
          }
          if (name === 'Armor') {
            return { find: () => ({ toArray: async () => [] }) };
          }
          return {};
        },
      };
      dbo.mockResolvedValue(connection);
      const res = await request(app)
        .put('/equipment/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: ['Plate'] });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Armor not found');
    });

    test('update armor invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-armor/123')
        .send({ armor: ['Plate'] });
      expect(res.status).toBe(400);
    });

    test('update armor invalid body', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-armor/507f1f77bcf86cd799439011')
        .send({ armor: 'Plate' });
      expect(res.status).toBe(400);
    });
  });

  describe('delete armor', () => {
    test('delete success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ deleteOne: async () => ({ acknowledged: true, deletedCount: 1 }) })
      });
      const res = await request(app).delete('/equipment/armor/507f1f77bcf86cd799439011');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ acknowledged: true });
    });

    test('delete armor invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).delete('/equipment/armor/123');
      expect(res.status).toBe(400);
    });

    test('delete armor not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ deleteOne: async () => ({ acknowledged: true, deletedCount: 0 }) })
      });
      const res = await request(app).delete('/equipment/armor/507f1f77bcf86cd799439011');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Armor not found');
    });
  });

  describe('/items', () => {
    test('validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).post('/equipment/items').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    test('insert success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ insertOne: async () => ({ insertedId: '507f1f77bcf86cd799439011' }) })
      });
      const res = await request(app)
        .post('/equipment/items')
        .send({
          campaign: 'Camp1',
          name: 'Potion of healing',
          category: 'adventuring gear',
          weight: 0.5,
          cost: '50 gp',
          notes: 'heals slightly',
          statBonuses: { str: 1 },
          skillBonuses: { acrobatics: 2 }
        });
      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.body.statBonuses.str).toBe(1);
      expect(res.body.skillBonuses.acrobatics).toBe(2);
    });

    test('numeric validation failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .post('/equipment/items')
        .send({
          campaign: 'Camp1',
          name: 'Potion of healing',
          category: 'adventuring gear',
          weight: 'bad',
          cost: '50 gp'
        });
      expect(res.status).toBe(400);
    });
  });

  describe('get items', () => {
    test('get items success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          find: () => ({
            toArray: async () => [{
              name: 'Potion of healing',
              statBonuses: { str: 1 },
              skillBonuses: { acrobatics: 2 }
            }]
          })
        })
      });
      const res = await request(app).get('/equipment/items/Camp1');
      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe('Potion of healing');
      expect(res.body[0].statBonuses.str).toBe(1);
      expect(res.body[0].skillBonuses.acrobatics).toBe(2);
    });

    test('get items failure', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          find: () => ({ toArray: async () => { throw new Error('db error'); } })
        })
      });
      const res = await request(app).get('/equipment/items/Camp1');
      expect(res.status).toBe(500);
    });
  });

  describe('update items', () => {
    test('update success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 1 }) })
      });
      const res = await request(app)
        .put('/equipment/items/507f1f77bcf86cd799439011')
        .send({ weight: 1 });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Item updated');
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) })
      });
      const res = await request(app)
        .put('/equipment/items/507f1f77bcf86cd799439011')
        .send({ weight: 1 });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item not found');
    });

    test('update item invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/items/123')
        .send({ weight: 1 });
      expect(res.status).toBe(400);
    });

    test('update item numeric failure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/items/507f1f77bcf86cd799439011')
        .send({ weight: 'heavy' });
      expect(res.status).toBe(400);
    });
  });

  describe('delete items', () => {
    test('delete success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ deleteOne: async () => ({ acknowledged: true, deletedCount: 1 }) })
      });
      const res = await request(app).delete('/equipment/items/507f1f77bcf86cd799439011');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ acknowledged: true });
    });

    test('delete item invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app).delete('/equipment/items/123');
      expect(res.status).toBe(400);
    });

    test('delete item not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ deleteOne: async () => ({ acknowledged: true, deletedCount: 0 }) })
      });
      const res = await request(app).delete('/equipment/items/507f1f77bcf86cd799439011');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item not found');
    });
  });

  describe('update-item', () => {
    test('update success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 1 }) })
      });
      const res = await request(app)
        .put('/equipment/update-item/507f1f77bcf86cd799439011')
        .send({ item: [{ name: 'potion-healing' }] });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Item updated');
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) })
      });
      const res = await request(app)
        .put('/equipment/update-item/507f1f77bcf86cd799439011')
        .send({ item: [{ name: 'potion-healing' }] });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item not found');
    });

    test('update item invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-item/123')
        .send({ item: [{ name: 'potion-healing' }] });
      expect(res.status).toBe(400);
    });

    test('update item invalid body', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-item/507f1f77bcf86cd799439011')
        .send({ item: 'potion-healing' });
      expect(res.status).toBe(400);
    });

    test('update item invalid structure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-item/507f1f77bcf86cd799439011')
        .send({ item: ['potion-healing'] });
      expect(res.status).toBe(400);
    });
  });

  describe('update-equipment', () => {
    test('update success', async () => {
      const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 });
      dbo.mockResolvedValue({
        collection: () => ({ updateOne }),
      });
      const payload = {
        equipment: {
          mainHand: { name: 'Longsword', source: 'weapon' },
          offHand: { name: 'Longsword', source: 'weapon' },
          ringLeft: 'Ring of Protection',
        },
      };
      const res = await request(app)
        .put('/equipment/update-equipment/507f1f77bcf86cd799439011')
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Equipment updated');
      expect(updateOne).toHaveBeenCalledTimes(1);
      const [query, update] = updateOne.mock.calls[0];
      expect(query).toEqual({ _id: expect.any(Object) });
      const updatedEquipment = update.$set.equipment;
      expect(Object.keys(updatedEquipment).sort()).toEqual(
        [...EQUIPMENT_SLOT_KEYS].sort()
      );
      expect(updatedEquipment.mainHand).toBeNull();
      expect(updatedEquipment.offHand).toMatchObject({
        name: 'Longsword',
        source: 'weapon',
      });
      expect(updatedEquipment.ringLeft).toMatchObject({
        name: 'Ring of Protection',
      });
    });

    test('update not found', async () => {
      dbo.mockResolvedValue({
        collection: () => ({ updateOne: async () => ({ matchedCount: 0 }) }),
      });
      const res = await request(app)
        .put('/equipment/update-equipment/507f1f77bcf86cd799439011')
        .send({ equipment: {} });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Equipment not found');
    });

    test('update equipment invalid id', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-equipment/123')
        .send({ equipment: {} });
      expect(res.status).toBe(400);
    });

    test('update equipment invalid structure', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-equipment/507f1f77bcf86cd799439011')
        .send({ equipment: { mainHand: {} } });
      expect(res.status).toBe(400);
    });

    test('update equipment invalid slot', async () => {
      dbo.mockResolvedValue({});
      const res = await request(app)
        .put('/equipment/update-equipment/507f1f77bcf86cd799439011')
        .send({ equipment: { tail: { name: 'Tail Blade' } } });
      expect(res.status).toBe(400);
    });
  });
});

