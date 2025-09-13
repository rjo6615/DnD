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
let zodResponseFormat;
try {
  ({ zodResponseFormat } = require('openai/helpers/zod'));
} catch {
  zodResponseFormat = null;
}
const { types: weaponTypes, categories: weaponCategories } = require('../data/weapons');
const { types: armorTypes, categories: armorCategories } = require('../data/armor');
const { categories: itemCategories } = require('../data/items');
const { skillNames } = require('./fieldConstants');

module.exports = (router) => {
  const aiRouter = express.Router();

  aiRouter.post('/weapon', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    if (!OpenAI || !z || !zodResponseFormat) {
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
      const { json_schema, ...rest } = zodResponseFormat(WeaponSchema);
      const format = { name: 'weapon', schema: json_schema.schema, ...rest };
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          { role: 'system', content: 'Create a Dungeons and Dragons weapon.' },
          { role: 'user', content: prompt },
        ],
        text: { format },
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
    if (!OpenAI || !z || !zodResponseFormat) {
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
      const { json_schema, ...rest } = zodResponseFormat(ArmorSchema);
      const format = { name: 'armor', schema: json_schema.schema, ...rest };
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          { role: 'system', content: 'Create a Dungeons and Dragons armor.' },
          { role: 'user', content: prompt },
        ],
        text: { format },
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
    if (!OpenAI || !z || !zodResponseFormat) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

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
      const { json_schema, ...rest } = zodResponseFormat(ItemSchema);
      const format = { name: 'item', schema: json_schema.schema, ...rest };
      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          {
            role: 'system',
            content:
              'Create a Dungeons and Dragons item. Only include "statBonuses" or "skillBonuses" if the prompt explicitly suggests mechanical bonuses; otherwise omit these fields.',
          },
          { role: 'user', content: prompt },
        ],
        text: { format },
      });

      const data = response.output?.[0]?.content?.[0]?.parsed;
      const parsed = ItemSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(500).json({ message: parsed.error.message });
      }
      let item = parsed.data;
      const needsStats = !item.statBonuses || Object.keys(item.statBonuses).length === 0;
      const needsSkills = !item.skillBonuses || Object.keys(item.skillBonuses).length === 0;
      if (needsStats || needsSkills) {
        const statMap = {
          strength: 'str',
          dexterity: 'dex',
          constitution: 'con',
          intelligence: 'int',
          wisdom: 'wis',
          charisma: 'cha',
        };
        const skillMap = skillNames.reduce((acc, skill) => {
          acc[skill.toLowerCase()] = skill;
          return acc;
        }, {});
        const statBonuses = { ...item.statBonuses };
        const skillBonuses = { ...item.skillBonuses };
        const regex = /\+(\d+)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?=(?:\s+and\b|\s+\+|$))/gi;
        let match;
        while ((match = regex.exec(prompt))) {
          const value = Number(match[1]);
          const name = match[2].toLowerCase().replace(/\s+/g, '');
          if (needsStats && statMap[name]) {
            statBonuses[statMap[name]] = value;
          } else if (needsSkills && skillMap[name]) {
            skillBonuses[skillMap[name]] = value;
          }
        }
        if (needsStats && Object.keys(statBonuses).length) {
          item.statBonuses = statBonuses;
        }
        if (needsSkills && Object.keys(skillBonuses).length) {
          item.skillBonuses = skillBonuses;
        }
      }
      return res.json(item);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.use('/ai', aiRouter);
};
