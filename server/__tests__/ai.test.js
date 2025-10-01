process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';
process.env.OPENAI_API_KEY = 'test';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
jest.mock('../middleware/auth', () => (req, res, next) => next());

jest.mock(
  'openai',
  () => {
    class OpenAI {
      constructor() {
        this.responses = { parse: (...a) => OpenAI.__parse(...a) };
        this.images = { generate: (...a) => OpenAI.__generate(...a) };
      }
    }
    OpenAI.__parse = jest.fn();
    OpenAI.__generate = jest.fn();
    return OpenAI;
  },
  { virtual: true }
);
jest.mock(
  'openai/helpers/zod',
  () => ({ zodResponseFormat: () => ({ json_schema: { schema: {} } }) }),
  { virtual: true }
);

jest.mock(
  'zod',
  () => {
    function makeSchema(check) {
      return {
        check,
        optional() {
          return makeSchema((v) => v === undefined || check(v));
        },
        nullable() {
          return makeSchema((v) => v === null || check(v));
        },
        trim() {
          return makeSchema((v) => typeof v === 'string' && check(v.trim ? v.trim() : v));
        },
        min() {
          return makeSchema(check);
        },
        regex() {
          return makeSchema(check);
        },
        url() {
          return makeSchema(check);
        },
        int() {
          return makeSchema(check);
        },
        positive() {
          return makeSchema(check);
        },
      };
    }
    const z = {
      string: () => makeSchema((v) => typeof v === 'string'),
      number: () => makeSchema((v) => typeof v === 'number'),
      boolean: () => makeSchema((v) => typeof v === 'boolean'),
      enum: (vals) => makeSchema((v) => vals.includes(v)),
      array: (s) => makeSchema((v) => Array.isArray(v) && v.every(s.check)),
      object: (shape) => {
        const schema = makeSchema((v) => v && typeof v === 'object');
        schema.safeParse = (d) => {
          for (const k in shape) {
            if (!shape[k].check(d[k])) {
              return { success: false, error: { message: 'Invalid' } };
            }
          }
          return { success: true, data: d };
        };
        schema.passthrough = () => schema;
        schema.partial = () => {
          const newShape = {};
          for (const k in shape) {
            newShape[k] = shape[k].optional();
          }
          return z.object(newShape);
        };
        schema.catchall = (s) => {
          const cs = makeSchema(
            (v) => v && typeof v === 'object' && Object.values(v).every(s.check)
          );
          cs.safeParse = (d) => {
            for (const val of Object.values(d || {})) {
              if (!s.check(val)) {
                return { success: false, error: { message: 'Invalid' } };
              }
            }
            return { success: true, data: d };
          };
          cs.catchall = () => cs;
          return cs;
        };
        return schema;
      },
    };
    return { z };
  },
  { virtual: true }
);

jest.mock('../utils/cloudinary', () => ({
  uploadMapImage: jest.fn(),
}));

const OpenAI = require('openai');
const mockParse = OpenAI.__parse;
const mockGenerate = OpenAI.__generate;

const { uploadMapImage: mockUploadMapImage } = require('../utils/cloudinary');

const routes = require('../routes');
const {
  categories: accessoryCategories,
  slotKeys: accessorySlotKeys,
} = require('../data/accessories');

const app = express();
app.use(express.json());
app.use(routes);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('AI item route', () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  test('returns item with stat and skill bonuses', async () => {
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'AI Item',
                category: 'adventuring gear',
                statBonuses: { str: 2 },
                skillBonuses: { acrobatics: 3 },
              },
            },
          ],
        },
      ],
    });

    const res = await request(app).post('/ai/item').send({ prompt: 'make item' });
    expect(res.status).toBe(200);
    expect(res.body.statBonuses).toEqual({ str: 2 });
    expect(res.body.skillBonuses).toEqual({ acrobatics: 3 });
    expect(mockParse.mock.calls[0][0].text.format.name).toBe('item');
  });

  test('returns item without bonuses when AI omits them', async () => {
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'Ring',
                category: 'adventuring gear',
              },
            },
          ],
        },
      ],
    });

    const res = await request(app)
      .post('/ai/item')
      .send({ prompt: 'ring that grants +2 Strength and +1 Stealth' });
    expect(res.status).toBe(200);
    expect(res.body.statBonuses).toBeUndefined();
    expect(res.body.skillBonuses).toBeUndefined();
    expect(mockParse.mock.calls[0][0].text.format.name).toBe('item');
  });

  test('validates incorrect bonus data', async () => {
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'Bad Item',
                category: 'adventuring gear',
                statBonuses: { str: 'high' },
              },
            },
          ],
        },
      ],
    });

    const res = await request(app).post('/ai/item').send({ prompt: 'bad item' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBeDefined();
    expect(mockParse.mock.calls[0][0].text.format.name).toBe('item');
  });
});

describe('AI accessory route', () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  test('returns accessory with slots and bonuses', async () => {
    const category = accessoryCategories[0];
    const slot = accessorySlotKeys[0];
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'Stargazer Circlet',
                category,
                targetSlots: [slot],
                rarity: 'rare',
                statBonuses: { int: 2 },
              },
            },
          ],
        },
      ],
    });

    const res = await request(app)
      .post('/ai/accessory')
      .send({ prompt: 'create an accessory' });
    expect(res.status).toBe(200);
    expect(res.body.targetSlots).toEqual([slot]);
    expect(res.body.category).toBe(category);
    expect(res.body.statBonuses).toEqual({ int: 2 });
    expect(mockParse.mock.calls[0][0].text.format.name).toBe('accessory');
  });

  test('handles invalid accessory data', async () => {
    const category = accessoryCategories[0];
    mockParse.mockResolvedValue({
      output: [
        {
          content: [
            {
              parsed: {
                name: 'Broken Accessory',
                category,
                targetSlots: [],
              },
            },
          ],
        },
      ],
    });

    const res = await request(app)
      .post('/ai/accessory')
      .send({ prompt: 'invalid accessory' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBeDefined();
    expect(mockParse.mock.calls[0][0].text.format.name).toBe('accessory');
  });
});

describe('AI map route', () => {
  const originalImageModel = process.env.OPENAI_IMAGE_MODEL;
  const originalImageStyle = process.env.OPENAI_IMAGE_STYLE;
  const originalImageStyleModels = process.env.OPENAI_IMAGE_STYLE_MODELS;
  const originalImageResponseFormat = process.env.OPENAI_IMAGE_RESPONSE_FORMAT;

  beforeEach(() => {
    mockParse.mockReset();
    mockGenerate.mockReset();
    mockUploadMapImage.mockReset();
    mockUploadMapImage.mockRejectedValue(new Error('Cloudinary disabled'));
    process.env.OPENAI_IMAGE_MODEL = 'gpt-image-1';
    process.env.OPENAI_IMAGE_STYLE = 'vivid';
    delete process.env.OPENAI_IMAGE_STYLE_MODELS;
    delete process.env.OPENAI_IMAGE_RESPONSE_FORMAT;
  });

  afterAll(() => {
    process.env.OPENAI_IMAGE_MODEL = originalImageModel;
    process.env.OPENAI_IMAGE_STYLE = originalImageStyle;
    if (originalImageStyleModels === undefined) {
      delete process.env.OPENAI_IMAGE_STYLE_MODELS;
    } else {
      process.env.OPENAI_IMAGE_STYLE_MODELS = originalImageStyleModels;
    }
    if (originalImageResponseFormat === undefined) {
      delete process.env.OPENAI_IMAGE_RESPONSE_FORMAT;
    } else {
      process.env.OPENAI_IMAGE_RESPONSE_FORMAT = originalImageResponseFormat;
    }
  });

  test('returns generated image metadata with base64 output', async () => {
    mockGenerate.mockResolvedValue({
      data: [
        {
          b64_json: 'ZGF0YQ==',
          mime_type: 'image/webp',
          revised_prompt: 'Reimagined cavern layout',
        },
      ],
    });

    const res = await request(app)
      .post('/ai/map')
      .send({ prompt: 'create a cavern map' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: 'Reimagined Cavern Layout',
      imageBase64: 'ZGF0YQ==',
      imageType: 'image/webp',
      prompt: 'create a cavern map',
      provider: 'openai',
    });
    expect(res.body.altText).toBeTruthy();
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        prompt: expect.stringContaining('create a cavern map'),
        response_format: 'b64_json',
      })
    );
  });

  test('uploads generated maps to Cloudinary when available', async () => {
    mockUploadMapImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/map.png',
      public_id: 'maps/demo/map',
    });
    mockGenerate.mockResolvedValue({
      data: [
        {
          b64_json: 'ZGF0YQ==',
          mime_type: 'image/png',
        },
      ],
    });

    const res = await request(app)
      .post('/ai/map')
      .send({ prompt: 'cloud-hosted map' });

    expect(res.status).toBe(200);
    expect(mockUploadMapImage).toHaveBeenCalledWith(
      'data:image/png;base64,ZGF0YQ=='
    );
    expect(res.body.imageUrl).toBe('https://res.cloudinary.com/demo/map.png');
    expect(res.body.imageBase64).toBeUndefined();
    expect(res.body.prompt).toBe('cloud-hosted map');
    expect(res.body.cloudinaryPublicId).toBe('maps/demo/map');
  });

  test('falls back to base64 data when Cloudinary upload fails', async () => {
    mockUploadMapImage.mockRejectedValue(new Error('Upload failed'));
    mockGenerate.mockResolvedValue({
      data: [
        {
          b64_json: 'QUJD',
          mime_type: 'image/png',
        },
      ],
    });

    const res = await request(app)
      .post('/ai/map')
      .send({ prompt: 'base64 fallback map' });

    expect(res.status).toBe(200);
    expect(res.body.imageBase64).toBe('QUJD');
    expect(res.body.imageUrl).toBeUndefined();
    expect(res.body.cloudinaryPublicId).toBeUndefined();
  });

  test('derives a title from the user prompt when no revision is provided', async () => {
    mockGenerate.mockResolvedValue({
      data: [
        {
          b64_json: 'YmFzZTY0',
        },
      ],
    });

    const res = await request(app)
      .post('/ai/map')
      .send({ prompt: 'haunted crypt with flickering torches. include secret doors' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Haunted Crypt With Flickering Torches');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0].response_format).toBe('b64_json');
  });

  test('allows url responses when configured', async () => {
    process.env.OPENAI_IMAGE_RESPONSE_FORMAT = 'url';

    mockGenerate.mockResolvedValue({
      data: [
        {
          url: 'https://example.com/map.png',
        },
      ],
    });

    const res = await request(app)
      .post('/ai/map')
      .send({ prompt: 'standard map' });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.response_format).toBeUndefined();

    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toBe('https://example.com/map.png');
    expect(res.body.imageBase64).toBeUndefined();
  });

  test('returns error when the provider returns no image', async () => {
    mockGenerate.mockResolvedValue({ data: [] });

    const res = await request(app).post('/ai/map').send({ prompt: 'empty map' });

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('No image returned from the image provider');
  });

  test('rejects invalid map payloads', async () => {
    mockGenerate.mockResolvedValue({
      data: [
        {
          revised_prompt: 'Map without any image assets',
        },
      ],
    });

    const res = await request(app).post('/ai/map').send({ prompt: 'broken map' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Generated map was invalid');
  });

  test('omits style for models without style support', async () => {
    process.env.OPENAI_IMAGE_MODEL = 'gpt-image-1';
    delete process.env.OPENAI_IMAGE_STYLE_MODELS;

    mockGenerate.mockResolvedValue({
      data: [
        {
          url: 'https://example.com/map.png',
        },
      ],
    });

    await request(app).post('/ai/map').send({ prompt: 'no-style map' });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.style).toBeUndefined();
  });

  test('includes style when explicitly enabled for model', async () => {
    process.env.OPENAI_IMAGE_MODEL = 'dall-e-3';
    process.env.OPENAI_IMAGE_STYLE_MODELS = 'dall-e-3, gpt-image-1';
    process.env.OPENAI_IMAGE_STYLE = 'natural';

    mockGenerate.mockResolvedValue({
      data: [
        {
          url: 'https://example.com/map.png',
        },
      ],
    });

    await request(app).post('/ai/map').send({ prompt: 'styled map' });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.style).toBe('natural');
  });
});

