const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

jest.mock('../db/conn');
const dbo = require('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());
process.env.JWT_SECRET = 'testsecret';
const usersRouter = require('../routes');

const app = express();
app.use(express.json());
app.use(usersRouter);
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

describe('Users routes', () => {
  test('login success', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ username: 'alice', password: hashed })
      })
    });
    const res = await request(app).post('/login').send({ username: 'alice', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.body.token).toBeUndefined();
  });

  test('login failure with invalid password', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ username: 'alice', password: hashed })
      })
    });
    const res = await request(app).post('/login').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.body.token).toBeUndefined();
  });

  test('verify success', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ username: 'alice', password: hashed })
      })
    });
    const res = await request(app).post('/users/verify').send({ username: 'alice', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true });
  });

  test('verify failure with invalid password', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ username: 'alice', password: hashed })
      })
    });
    const res = await request(app).post('/users/verify').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.valid).toBeUndefined();
  });

  test('get users failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/users');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });

  test('register failure with duplicate username', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ username: 'alice' }),
        insertOne: jest.fn()
      })
    });
    const res = await request(app)
      .post('/users/add')
      .send({ username: 'alice', password: 'Strongpass1!' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Username already exists');
  });

  test('register failure with weak password', async () => {
    dbo.mockResolvedValue({ collection: () => ({}) });
    const res = await request(app)
      .post('/users/add')
      .send({ username: 'bob', password: 'weakpass' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
