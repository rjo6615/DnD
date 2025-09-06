process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
const charactersRouter = require('../routes');

const app = express();
app.use(express.json());
app.use(charactersRouter);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('Character routes', () => {
  test('add character success', async () => {
    let captured;
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async (doc) => {
          captured = doc;
          return { acknowledged: true };
        }
      })
    });
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
    expect(captured.allowedSkills).toEqual([]);
  });

  test('add character with array fields', async () => {
    let captured;
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async (doc) => {
          captured = doc;
          return { acknowledged: true };
        }
      })
    });
    const payload = {
      token: 'alice',
      characterName: 'Hero',
      campaign: 'Camp1',
      occupation: [
        {
          Level: '1',
          Name: 'Scout',
          skills: {
            acrobatics: { proficient: true },
            stealth: { proficient: false }
          }
        }
      ],
      feat: ['Power Attack'],
      weapon: ['Sword'],
      armor: ['Plate'],
      item: ['Potion'],
      spells: [{
        name: 'Fireball',
        level: 3,
        damage: '8d6',
        castingTime: '1 action',
        range: '150 ft',
        duration: 'Instantaneous',
      }],
    };
    const res = await request(app)
      .post('/characters/add')
      .send(payload);
    expect(res.status).toBe(200);
    expect(captured).toMatchObject({
      ...payload,
      occupation: [
        {
          Level: 1,
          Name: 'Scout',
          skills: {
            acrobatics: { proficient: true },
            stealth: { proficient: false }
          }
        }
      ],
      allowedSkills: ['acrobatics']
    });
    expect(Array.isArray(captured.feat)).toBe(true);
    expect(Array.isArray(captured.weapon)).toBe(true);
    expect(Array.isArray(captured.spells)).toBe(true);
    expect(captured.spells[0]).toMatchObject({
      name: 'Fireball',
      level: 3,
      damage: '8d6',
      castingTime: '1 action',
      range: '150 ft',
      duration: 'Instantaneous',
    });
  });

  test('add character db failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice', characterName: 'Hero', campaign: 'Camp1' });
    expect(res.status).toBe(500);
  });

  test('add character validation failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => ({ acknowledged: true })
      })
    });
    const res = await request(app)
      .post('/characters/add')
      .send({ token: 'alice' });
    expect(res.status).toBe(400);
  });

  test('update spells success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        updateOne: async () => ({ matchedCount: 1 }),
      }),
    });
    const res = await request(app)
      .put('/characters/507f1f77bcf86cd799439011/spells')
      .send({
        spells: [{
          name: 'Fireball',
          level: 3,
          damage: '8d6',
          castingTime: '1 action',
          range: '150 ft',
          duration: 'Instantaneous',
        }],
        spellPoints: 1,
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Spells updated');
  });

  test('get characters for campaign and user success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ token: 'alice', campaign: 'Camp1' }] })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/alice');
    expect(res.status).toBe(200);
    expect(res.body[0].token).toBe('alice');
  });

  test('get characters for campaign and user failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/alice');
    expect(res.status).toBe(500);
  });

  test('get all characters for campaign success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [
          { token: 'alice', campaign: 'Camp1' },
          { token: 'bob', campaign: 'Camp1' }
        ] })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/characters');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('get all characters for campaign failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaigns/Camp1/characters');
    expect(res.status).toBe(500);
  });

  test('get character computes allowedSkills from occupations', async () => {
    const character = {
      token: 'alice',
      campaign: 'Camp1',
      occupation: [
        {
          Level: 1,
          Name: 'Scout',
          skills: {
            acrobatics: { proficient: true },
            stealth: { proficient: false }
          }
        }
      ],
      feat: ['Power Attack'],
      weapon: ['Sword'],
      armor: ['Plate'],
      item: ['Potion']
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => character
      })
    });
    const res = await request(app).get('/characters/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.allowedSkills).toEqual(['acrobatics']);
    expect(res.body.occupation).toEqual(character.occupation);
    expect(Array.isArray(res.body.feat)).toBe(true);
    expect(Array.isArray(res.body.weapon)).toBe(true);
  });

  test('get character defaults allowedSkills to empty array', async () => {
    const character = { token: 'alice', campaign: 'Camp1' };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => character
      })
    });
    const res = await request(app).get('/characters/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.allowedSkills).toEqual([]);
  });

  test('get character returns spells with metadata', async () => {
    const character = {
      token: 'alice',
      campaign: 'Camp1',
      spells: [{
        name: 'Fireball',
        level: 3,
        damage: '8d6',
        castingTime: '1 action',
        range: '150 ft',
        duration: 'Instantaneous',
      }],
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => character,
      }),
    });
    const res = await request(app).get('/characters/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.spells[0]).toMatchObject({
      name: 'Fireball',
      level: 3,
      damage: '8d6',
      castingTime: '1 action',
      range: '150 ft',
      duration: 'Instantaneous',
    });
  });

  test('get weapons success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ name: 'Sword' }] })
      })
    });
    const res = await request(app).get('/equipment/weapons/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Sword');
  });

  test('get weapons failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/equipment/weapons/Camp1');
    expect(res.status).toBe(500);
  });

  test('get armor success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ armorName: 'Plate' }] })
      })
    });
    const res = await request(app).get('/equipment/armor/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].armorName).toBe('Plate');
  });

  test('get armor failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/equipment/armor/Camp1');
    expect(res.status).toBe(500);
  });

  test('get items success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ itemName: 'Potion' }] })
      })
    });
    const res = await request(app).get('/equipment/items/Camp1');
    expect(res.status).toBe(200);
    expect(res.body[0].itemName).toBe('Potion');
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

  test('get feats success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ feat: 'Power Attack' }] })
      })
    });
    const res = await request(app).get('/feats');
    expect(res.status).toBe(200);
    expect(res.body[0].feat).toBe('Power Attack');
  });

  test('get feats failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/feats');
    expect(res.status).toBe(500);
  });

  test('get occupations success', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/characters/occupations');
    expect(res.status).toBe(200);
    expect(res.body.some((c) => c.name === 'Fighter')).toBe(true);
  });

  test('get occupations failure', async () => {
    dbo.mockRejectedValue(new Error('db error'));
    const res = await request(app).get('/characters/occupations');
    expect(res.status).toBe(500);
  });

  test('update skill proficiency calculates correct modifier', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          occupation: [{ Level: 1, Occupation: 'Rogue' }],
          skills: {},
          proficiencyPoints: 1,
        }),
        findOneAndUpdate: async () => ({
          value: {
            dex: 12,
            occupation: [{ Level: 1, Occupation: 'Rogue' }],
            skills: { acrobatics: { proficient: true, expertise: false } },
          },
        }),
      }),
    });
    const res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'acrobatics', proficient: true, expertise: false });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      skill: 'acrobatics',
      proficient: true,
      expertise: false,
      modifier: 3,
      proficiencyBonus: 2,
    });
  });

  test('update skill expertise doubles proficiency bonus', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          occupation: [{ Level: 1, Occupation: 'Rogue' }],
          skills: {},
          proficiencyPoints: 1,
        }),
        findOneAndUpdate: async () => ({
          value: {
            dex: 12,
            occupation: [{ Level: 1, Occupation: 'Rogue' }],
            skills: { acrobatics: { proficient: true, expertise: true } },
          },
        }),
      }),
    });
    const res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'acrobatics', proficient: true, expertise: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      skill: 'acrobatics',
      proficient: true,
      expertise: true,
      modifier: 5,
      proficiencyBonus: 2,
    });
  });

  test('update skills failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          occupation: [{ Level: 1, Occupation: 'Rogue' }],
          skills: {},
          proficiencyPoints: 1,
        }),
        findOneAndUpdate: async () => {
          throw new Error('db error');
        },
      }),
    });
    const res = await request(app)
      .put('/skills/update-skills/507f1f77bcf86cd799439011')
      .send({ skill: 'acrobatics', proficient: true });
    expect(res.status).toBe(500);
  });

  test('add weapon success', async () => {
    const insertedId = '507f1f77bcf86cd799439012';
    const payload = {
      campaign: 'Camp1',
      name: 'Sword',
      category: 'Martial',
      damage: '1d8',
    };
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => ({ insertedId }) })
    });
    const res = await request(app)
      .post('/equipment/weapon/add')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ _id: insertedId, ...payload });
  });

  test('add weapon failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/equipment/weapon/add')
      .send({
        campaign: 'Camp1',
        name: 'Sword',
        category: 'Martial',
        damage: '1d8',
      });
    expect(res.status).toBe(500);
  });

  test('add armor success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => ({ insertedId: 'abc123' }) })
    });
    const payload = { campaign: 'Camp1', armorName: 'Plate' };
    const res = await request(app)
      .post('/equipment/armor/add')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: 'abc123', ...payload });
  });

  test('add armor failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/equipment/armor/add')
      .send({ campaign: 'Camp1', armorName: 'Plate' });
    expect(res.status).toBe(500);
  });

  test('add item success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => ({ acknowledged: true }) })
    });
    const res = await request(app)
      .post('/equipment/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });

  test('add item failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({ insertOne: async () => { throw new Error('db error'); } })
    });
    const res = await request(app)
      .post('/equipment/item/add')
      .send({ campaign: 'Camp1', itemName: 'Potion' });
    expect(res.status).toBe(500);
  });

  test('get character invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).get('/characters/123');
    expect(res.status).toBe(400);
  });

  test('delete character invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app).delete('/characters/delete-character/123');
    expect(res.status).toBe(400);
  });

  test('update level invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-level/123')
      .send({ level: 1, health: 1 });
    expect(res.status).toBe(400);
  });

  test('update level invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-level/507f1f77bcf86cd799439011')
      .send({ level: 'one', health: 1 });
    expect(res.status).toBe(400);
  });

  test('update dice color invalid id', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-dice-color/123')
      .send({ diceColor: 'blue' });
    expect(res.status).toBe(400);
  });

  test('update dice color invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/update-dice-color/507f1f77bcf86cd799439011')
      .send({ diceColor: 5 });
    expect(res.status).toBe(400);
  });

  test('update feats success', async () => {
    let captured;
    dbo.mockResolvedValue({
      collection: () => ({
        updateOne: async (filter, update) => {
          captured = { filter, update };
          return { modifiedCount: 1 };
        }
      })
    });
    const res = await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: ['Power Attack', 'Cleave'] });
    expect(res.status).toBe(200);
    expect(captured.update.$push.feat.$each).toEqual(['Power Attack', 'Cleave']);
  });

  test('append feats across requests', async () => {
    const character = { feat: [] };
    dbo.mockResolvedValue({
      collection: () => ({
        updateOne: async (filter, update) => {
          character.feat.push(...update.$push.feat.$each);
          return { modifiedCount: 1 };
        },
        findOne: async () => character
      })
    });

    await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: ['Power Attack'] });

    await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: ['Cleave'] });

    const res = await request(app).get('/characters/507f1f77bcf86cd799439011');
    expect(res.body.feat).toEqual(['Power Attack', 'Cleave']);
  });

  test('update feats invalid body', async () => {
    dbo.mockResolvedValue({});
    const res = await request(app)
      .put('/characters/507f1f77bcf86cd799439011/feats')
      .send({ feat: 'Power Attack' });
    expect(res.status).toBe(400);
  });

  test('multiclass success', async () => {
    let captured;
    const character = { health: 10, occupation: [], str: 14 };
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Characters') {
          return {
            findOne: async () => character,
            updateOne: async (filter, update) => {
              captured = { filter, update };
              return { modifiedCount: 1 };
            },
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const res = await request(app)
      .post('/characters/multiclass/507f1f77bcf86cd799439011')
      .send({ newOccupation: 'Fighter' });
    expect(res.status).toBe(200);
    expect(captured.update.$set.health).toBe(11);
    const occ = captured.update.$set.occupation[0];
    expect(occ.Occupation).toBe('Fighter');
    expect(occ.skills.acrobatics).toEqual({ proficient: true, expertise: false });
    expect(occ.proficiencyPoints).toBe(0);
    expect(captured.update.$set.allowedSkills).toEqual([
      'acrobatics',
      'animalHandling',
      'athletics',
      'history',
      'insight',
      'intimidation',
      'perception',
      'survival',
    ]);
    expect(res.body.occupation[0].Occupation).toBe('Fighter');
    Math.random.mockRestore();
  });

  test('multiclass ability failure', async () => {
    const character = { health: 10, occupation: [], str: 10, dex: 10 };
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Characters') {
          return {
            findOne: async () => character,
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });
    const res = await request(app)
      .post('/characters/multiclass/507f1f77bcf86cd799439011')
      .send({ newOccupation: 'Fighter' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/STR or DEX 13/);
  });

  test('update feat with skills updates character', async () => {
    let captured;
    const character = {
      occupation: [],
      feat: [],
      skills: { acrobatics: { proficient: false, expertise: false } },
      allowedSkills: [],
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => character,
        updateOne: async (filter, update) => {
          captured = update;
          return { modifiedCount: 1 };
        },
      }),
    });
    const newFeat = [
      { featName: 'Agile', skills: { acrobatics: { proficient: true } } },
    ];
    const res = await request(app)
      .put('/feats/update/507f1f77bcf86cd799439011')
      .send({ feat: newFeat });
    expect(res.status).toBe(200);
    expect(captured.$set.feat).toEqual(newFeat);
    expect(captured.$set.skills.acrobatics.proficient).toBe(true);
    expect(captured.$set.allowedSkills).toEqual(['acrobatics']);
  });

  test('removing feat strips granted skills', async () => {
    let captured;
    const character = {
      occupation: [],
      feat: [
        { featName: 'Agile', skills: { acrobatics: { proficient: true } } },
      ],
      skills: { acrobatics: { proficient: true, expertise: false } },
      allowedSkills: ['acrobatics'],
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => character,
        updateOne: async (filter, update) => {
          captured = update;
          return { modifiedCount: 1 };
        },
      }),
    });

    const res = await request(app)
      .put('/feats/update/507f1f77bcf86cd799439011')
      .send({ feat: [] });
    expect(res.status).toBe(200);
    expect(captured.$set.feat).toEqual([]);
    expect(captured.$set.allowedSkills).toEqual([]);
    expect(captured.$set.skills.acrobatics.proficient).toBe(false);
  });
});
