process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

const originalEnv = { ...process.env };

const buildApp = (usageImpl) => {
  jest.resetModules();

  process.env = {
    ...originalEnv,
    CLOUDINARY_CLOUD_NAME: 'demo',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  };

  jest.doMock('../db/conn', () => jest.fn().mockResolvedValue({}));
  jest.doMock('../middleware/auth', () => (req, res, next) => next());
  jest.doMock('cloudinary', () => ({
    v2: {
      config: jest.fn(),
      api: { usage: usageImpl },
    },
  }));

  let app;
  let cloudinaryUtils;

  jest.isolateModules(() => {
    cloudinaryUtils = require('../utils/cloudinary');
    const routes = require('../routes');

    app = express();
    app.use(express.json());
    app.use(routes);
    app.use((err, req, res, next) => {
      const status = err.status || 500;
      const message = status === 500 ? 'Internal Server Error' : err.message;
      res.status(status).json({ message });
    });
  });

  return { app, cloudinaryUtils };
};

afterEach(() => {
  jest.resetModules();
  jest.dontMock('cloudinary');
  jest.dontMock('../db/conn');
  jest.dontMock('../middleware/auth');
  process.env = { ...originalEnv };
});

describe('Cloudinary usage route', () => {
  test('responds with usage data and records API call metrics', async () => {
    const mockUsage = { credits: { usage: 42 } };
    const usageImpl = jest.fn().mockResolvedValue(mockUsage);

    const { app, cloudinaryUtils } = buildApp(usageImpl);

    const res = await request(app).get('/usage');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ usage: mockUsage });
    expect(usageImpl).toHaveBeenCalledTimes(1);

    const counts = cloudinaryUtils.getCloudinaryApiCallCounts();
    expect(counts.byAction['api.usage']).toBe(1);
    expect(counts.total).toBe(1);
  });

  test('returns 500 when Cloudinary usage retrieval fails', async () => {
    const usageImpl = jest.fn().mockRejectedValue(new Error('usage unavailable'));

    const { app } = buildApp(usageImpl);

    const res = await request(app).get('/usage');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: 'Failed to retrieve Cloudinary usage',
      reason: 'usage unavailable',
    });
    expect(usageImpl).toHaveBeenCalledTimes(1);
  });

  test('uses Cloudinary http_code when available', async () => {
    const error = new Error('Not allowed in current plan');
    error.http_code = 403;
    const usageImpl = jest.fn().mockRejectedValue(error);

    const { app } = buildApp(usageImpl);

    const res = await request(app).get('/usage');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: 'Failed to retrieve Cloudinary usage',
      reason: 'Not allowed in current plan',
    });
    expect(usageImpl).toHaveBeenCalledTimes(1);
  });
});
