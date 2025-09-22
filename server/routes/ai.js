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
const {
  types: armorTypes,
  categories: armorCategories,
} = require('../data/armor');
const { ARMOR_SLOT_OPTIONS } = require('../constants/equipmentSlots');
const { categories: itemCategories } = require('../data/items');
const {
  categories: accessoryCategories,
  slotKeys: accessorySlotKeys,
} = require('../data/accessories');
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

    const armorSlotKeys = ARMOR_SLOT_OPTIONS.map((slot) => slot.key);

    const ArmorSchema = z.object({
      name: z.string(),
      type: z.enum(armorTypes),
      category: z.enum(armorCategories),
      slot: z.enum(armorSlotKeys),
      equipmentSlot: z.enum(armorSlotKeys).optional(),
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
          {
            role: 'system',
            content: `Create a Dungeons and Dragons armor. Always include a "slot" field matching one of the following equipment slots: ${armorSlotKeys.join(
              ', '
            )}. If the armor occupies a different equipment slot than it is worn on, include an "equipmentSlot" field set to a value from the same list.`,
          },
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
      const skillsList = skillNames.join(', ');

      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          {
            role: 'system',
            content: `Create a Dungeons and Dragons item. Include "statBonuses" or "skillBonuses" only if the prompt suggests bonuses to ability scores (str, dex, con, int, wis, cha) or skills (${skillsList}); otherwise omit these fields.`,
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
      return res.json(parsed.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  aiRouter.post('/accessory', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    if (!OpenAI || !z || !zodResponseFormat) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const AccessorySchema = z.object({
      name: z.string(),
      category: z.enum(accessoryCategories),
      targetSlots: z.array(z.enum(accessorySlotKeys)),
      rarity: z.string().optional(),
      weight: z.number().optional(),
      cost: z.string().optional(),
      notes: z.string().optional(),
      statBonuses: z.object({}).catchall(z.number()).optional(),
      skillBonuses: z.object({}).catchall(z.number()).optional(),
    });

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { json_schema, ...rest } = zodResponseFormat(AccessorySchema);
      const format = { name: 'accessory', schema: json_schema.schema, ...rest };
      const slotList = accessorySlotKeys.join(', ');
      const categoryList = accessoryCategories.join(', ');
      const skillsList = skillNames.join(', ');

      const response = await openai.responses.parse({
        model: 'gpt-4o-2024-08-06',
        input: [
          {
            role: 'system',
            content: `Create a Dungeons and Dragons accessory. Always include a non-empty "targetSlots" array using only these slots: ${slotList}. Choose a "category" from the following list: ${categoryList}. Include "statBonuses" or "skillBonuses" only if the description suggests bonuses to ability scores (str, dex, con, int, wis, cha) or skills (${skillsList}).`,
          },
          { role: 'user', content: prompt },
        ],
        text: { format },
      });

      const data = response.output?.[0]?.content?.[0]?.parsed;
      const parsed = AccessorySchema.safeParse(data);
      if (!parsed.success) {
        return res.status(500).json({ message: parsed.error.message });
      }
      if (!Array.isArray(parsed.data.targetSlots) || parsed.data.targetSlots.length === 0) {
        return res.status(500).json({ message: 'targetSlots must be a non-empty array' });
      }
      return res.json(parsed.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.use('/ai', aiRouter);
};
