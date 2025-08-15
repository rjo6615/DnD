const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

jest.mock('../db/conn');
const dbo = require('../db/conn');
process.env.JWT_SECRET = 'testsecret';
const usersRouter = require('../routes.js');

const app = express();
app.use(express.json());
app.use(usersRouter);

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
    expect(res.body.token).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
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
    expect(res.body.token).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
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
});
