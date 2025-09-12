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
const { categories: itemCategories } = require('../data/items');

// Parse bonuses mentioned directly in the prompt
function extractBonuses(prompt = '') {
  const abilityMap = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha',
  };

  const skillMap = {
    'acrobatics': 'acrobatics',
    'animal handling': 'animalHandling',
    'arcana': 'arcana',
    'athletics': 'athletics',
    'deception': 'deception',
    'history': 'history',
    'insight': 'insight',
    'intimidation': 'intimidation',
    'investigation': 'investigation',
    'medicine': 'medicine',
    'nature': 'nature',
    'perception': 'perception',
    'performance': 'performance',
    'persuasion': 'persuasion',
    'religion': 'religion',
    'sleight of hand': 'sleightOfHand',
    'stealth': 'stealth',
    'survival': 'survival',
  };

  const lower = String(prompt).toLowerCase();
  const statBonuses = {};
  const skillBonuses = {};

  const parseMap = (map, target) => {
    for (const [name, key] of Object.entries(map)) {
      const re1 = new RegExp(`\\b${name}\\b\\s*\\+\\s*(\\d+)`);
      const re2 = new RegExp(`\\+\\s*(\\d+)\\s*(?:to\\s*)?\\b${name}\\b`);
      let match = lower.match(re1) || lower.match(re2);
      if (match) {
        target[key] = parseInt(match[1], 10);
      }
    }
  };

  parseMap(abilityMap, statBonuses);
  parseMap(skillMap, skillBonuses);

  return { statBonuses, skillBonuses };
}

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
    const { statBonuses: promptStatBonuses, skillBonuses: promptSkillBonuses } =
      extractBonuses(prompt);

    const ItemSchema = z.object({
      name: z.string(),
      category: z.enum(itemCategories),
      weight: z.number().optional(),
      cost: z.string().optional(),
      properties: z.array(z.string()).optional(),
      statBonuses: z.object({}).catchall(z.number()).optional(),
      skillBonuses: z.object({}).catchall(z.number()).optional(),
    });

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          {
            role: 'system',
            content:
              'Create a Dungeons and Dragons item. If the user describes bonuses to abilities (Strength, Dexterity, etc.) or skills (Stealth, Acrobatics, etc.), you MUST include them in "statBonuses" or "skillBonuses" with canonical keys and numeric values.',
          },
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
      const item = { ...parsed.data };
      const statBonuses = {
        ...(parsed.data.statBonuses || {}),
        ...promptStatBonuses,
      };
      const skillBonuses = {
        ...(parsed.data.skillBonuses || {}),
        ...promptSkillBonuses,
      };
      if (Object.keys(statBonuses).length) {
        item.statBonuses = statBonuses;
      }
      if (Object.keys(skillBonuses).length) {
        item.skillBonuses = skillBonuses;
      }
      return res.json(item);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.use('/ai', aiRouter);
};
