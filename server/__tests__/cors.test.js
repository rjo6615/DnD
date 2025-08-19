const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Set allowed origins for the test
process.env.ALLOWED_ORIGINS = 'http://allowed.com';

// Re-create the CORS configuration from the server
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.get('/test', (req, res) => res.json({ ok: true }));
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

describe('CORS origin handling', () => {
  test('allows requests from configured origins', async () => {
    const res = await request(app).get('/test').set('Origin', 'http://allowed.com');
    expect(res.status).toBe(200);
  });

  test('rejects requests from disallowed origins', async () => {
    const res = await request(app).get('/test').set('Origin', 'http://bad.com');
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/Not allowed by CORS/);
  });
});
