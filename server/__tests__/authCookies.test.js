process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';
process.env.NODE_ENV = 'production';

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

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

describe('Auth cookies in production', () => {
  test('login sets secure cross-subdomain cookie', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ username: 'alice', password: hashed })
      })
    });
    const res = await request(app).post('/login').send({ username: 'alice', password: 'secret' });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/Domain=\.realmtracker\.org/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=None/);
  });

  test('logout clears cookie across subdomains', async () => {
    dbo.mockResolvedValue({ collection: () => ({}) });
    const res = await request(app).post('/logout');
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/Domain=\.realmtracker\.org/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=None/);
  });
});

afterAll(() => {
  process.env.NODE_ENV = 'test';
});
