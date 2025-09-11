const express = require('express');
let OpenAI;
try {
  OpenAI = require('openai');
} catch {
  OpenAI = null;
}
let z;
try {
  ({ z } = require('zod'));
} catch {
  z = null;
}
let zodTextFormat;
try {
  ({ zodTextFormat } = require('openai/helpers/zod'));
} catch {
  zodTextFormat = null;
}
const { types: weaponTypes, categories: weaponCategories } = require('../data/weapons');
const { types: armorTypes, categories: armorCategories } = require('../data/armor');
const { types: itemTypes, categories: itemCategories } = require('../data/items');

module.exports = (router) => {
  const aiRouter = express.Router();

  aiRouter.post('/weapon', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    if (!OpenAI || !z || !zodTextFormat) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const WeaponSchema = z.object({
      name: z.string(),
      type: z.enum(weaponTypes),
      category: z.enum(weaponCategories),
      damage: z.string(),
      properties: z.array(z.string()).optional(),
      weight: z.number().optional(),
      cost: z.number().optional(),
    });

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          { role: 'system', content: 'Create a Dungeons and Dragons weapon.' },
          { role: 'user', content: prompt },
        ],
        text: {
          format: zodTextFormat(WeaponSchema, 'weapon'),
        },
      });

      const data = response.output?.[0]?.content?.[0]?.parsed;
      const parsed = WeaponSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(500).json({ message: parsed.error.message });
      }
      return res.json(parsed.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  aiRouter.post('/armor', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    if (!OpenAI || !z || !zodTextFormat) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const ArmorSchema = z.object({
      name: z.string(),
      type: z.enum(armorTypes),
      category: z.enum(armorCategories),
      armorBonus: z.number().optional(),
      acBonus: z.number().optional(),
      maxDex: z.number().optional(),
      strength: z.number().optional(),
      stealth: z.boolean().optional(),
      weight: z.number().optional(),
      cost: z.string().optional(),
    });

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          { role: 'system', content: 'Create a Dungeons and Dragons armor.' },
          { role: 'user', content: prompt },
        ],
        text: {
          format: zodTextFormat(ArmorSchema, 'armor'),
        },
      });

      const data = response.output?.[0]?.content?.[0]?.parsed;
      const parsed = ArmorSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(500).json({ message: parsed.error.message });
      }
      return res.json(parsed.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  aiRouter.post('/item', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    if (!OpenAI || !z || !zodTextFormat) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const ItemSchema = z.object({
      name: z.string(),
      type: z.enum(itemTypes),
      category: z.enum(itemCategories),
      weight: z.number().optional(),
      cost: z.string().optional(),
      properties: z.array(z.string()).optional(),
    });

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          { role: 'system', content: 'Create a Dungeons and Dragons item.' },
          { role: 'user', content: prompt },
        ],
        text: {
          format: zodTextFormat(ItemSchema, 'item'),
        },
      });

      const data = response.output?.[0]?.content?.[0]?.parsed;
      const parsed = ItemSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(500).json({ message: parsed.error.message });
      }
      return res.json(parsed.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.use('/ai', aiRouter);
};
