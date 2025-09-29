const express = require('express');
let OpenAI;
let z;
let zodResponseFormat;
const logger = require('../utils/logger');
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
const createMapSchema = require('../schemas/map');
const { deriveMapTitle } = require('../utils/mapTitle');

const resolveOpenAI = () => {
  if (!OpenAI) {
    try {
      OpenAI = require('openai');
    } catch {
      OpenAI = null;
    }
  }
  return OpenAI;
};

const resolveZod = () => {
  if (!z) {
    try {
      ({ z } = require('zod'));
    } catch {
      z = null;
    }
  }
  return z;
};

const resolveZodResponseFormat = () => {
  if (!zodResponseFormat) {
    try {
      ({ zodResponseFormat } = require('openai/helpers/zod'));
    } catch {
      zodResponseFormat = null;
    }
  }
  return zodResponseFormat;
};

module.exports = (router) => {
  const aiRouter = express.Router();

  const buildFormat = (schema, name) => {
    const responseFormatter = resolveZodResponseFormat();
    if (!responseFormatter) {
      return { name, schema: {} };
    }

    try {
      const { json_schema, ...rest } = responseFormatter(schema);
      const resolvedSchema = json_schema?.schema ?? json_schema ?? {};
      return { name, schema: resolvedSchema, ...rest };
    } catch (error) {
      logger.warn('Falling back to basic OpenAI schema', {
        route: name,
        error: error.message,
      });
      return { name, schema: {} };
    }
  };

  let mapSchemas;
  const getMapSchemas = (Z) => {
    if (!mapSchemas) {
      mapSchemas = createMapSchema(Z);
    }
    return mapSchemas;
  };

  aiRouter.post('/weapon', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    const OpenAIClient = resolveOpenAI();
    const Z = resolveZod();
    if (!OpenAIClient || !Z || !resolveZodResponseFormat()) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const WeaponSchema = Z.object({
      name: Z.string(),
      type: Z.enum(weaponTypes),
      category: Z.enum(weaponCategories),
      damage: Z.string(),
      properties: Z.array(Z.string()).nullable().optional(),
      weight: Z.number().nullable().optional(),
      cost: Z.number().nullable().optional(),
    });

    try {
      const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
      const format = buildFormat(WeaponSchema, 'weapon');
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
    const OpenAIClient = resolveOpenAI();
    const Z = resolveZod();
    if (!OpenAIClient || !Z || !resolveZodResponseFormat()) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const armorSlotKeys = ARMOR_SLOT_OPTIONS.map((slot) => slot.key);

    const ArmorSchema = Z.object({
      name: Z.string(),
      type: Z.enum(armorTypes),
      category: Z.enum(armorCategories),
      slot: Z.enum(armorSlotKeys),
      equipmentSlot: Z.enum(armorSlotKeys).nullable().optional(),
      armorBonus: Z.number().nullable().optional(),
      acBonus: Z.number().nullable().optional(),
      maxDex: Z.number().nullable().optional(),
      strength: Z.number().nullable().optional(),
      stealth: Z.boolean().nullable().optional(),
      weight: Z.number().nullable().optional(),
      cost: Z.string().nullable().optional(),
    });

    try {
      const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
      const format = buildFormat(ArmorSchema, 'armor');
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
    const OpenAIClient = resolveOpenAI();
    const Z = resolveZod();
    if (!OpenAIClient || !Z || !resolveZodResponseFormat()) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const ItemSchema = Z.object({
      name: Z.string(),
      category: Z.enum(itemCategories),
      weight: Z.number().nullable().optional(),
      cost: Z.string().nullable().optional(),
      properties: Z.array(Z.string()).nullable().optional(),
      statBonuses: Z.object({}).catchall(Z.number()).nullable().optional(),
      skillBonuses: Z.object({}).catchall(Z.number()).nullable().optional(),
    });

    try {
      const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
      const format = buildFormat(ItemSchema, 'item');
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
    const OpenAIClient = resolveOpenAI();
    const Z = resolveZod();
    if (!OpenAIClient || !Z || !resolveZodResponseFormat()) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const AccessorySchema = Z.object({
      name: Z.string(),
      category: Z.enum(accessoryCategories),
      targetSlots: Z.array(Z.enum(accessorySlotKeys)),
      rarity: Z.string().nullable().optional(),
      weight: Z.number().nullable().optional(),
      cost: Z.string().nullable().optional(),
      notes: Z.string().nullable().optional(),
      statBonuses: Z.object({}).catchall(Z.number()).nullable().optional(),
      skillBonuses: Z.object({}).catchall(Z.number()).nullable().optional(),
    });

    try {
      const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
      const format = buildFormat(AccessorySchema, 'accessory');
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

  aiRouter.post('/map', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const OpenAIClient = resolveOpenAI();
    if (!OpenAIClient) {
      return res.status(500).json({ message: 'OpenAI not configured' });
    }

    const Z = resolveZod();
    const mapSchemas = Z ? getMapSchemas(Z) : null;

    try {
      const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
      const size = process.env.OPENAI_IMAGE_SIZE || '1024x1024';
      const quality = process.env.OPENAI_IMAGE_QUALITY;
      const responseFormat = process.env.OPENAI_IMAGE_RESPONSE_FORMAT || 'b64_json';

      const generationPrompt = `Top-down tactical battle map for Dungeons & Dragons 5th Edition. Include clear terrain features, obstacles, and space for miniatures on a grid, but do not draw grid labels. ${prompt.trim()}`;

      const requestPayload = {
        model,
        prompt: generationPrompt,
        size,
        n: 1,
      };

      if (responseFormat === 'b64_json') {
        requestPayload.response_format = responseFormat;
      }

      const configuredStyle = process.env.OPENAI_IMAGE_STYLE || 'vivid';
      const styleModelList = (process.env.OPENAI_IMAGE_STYLE_MODELS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      let includeStyle = Boolean(configuredStyle);
      if (includeStyle) {
        if (styleModelList.length > 0) {
          includeStyle = styleModelList.includes(model);
        } else {
          includeStyle = model !== 'gpt-image-1';
        }
      }

      if (includeStyle) {
        requestPayload.style = configuredStyle;
      }

      if (quality) {
        requestPayload.quality = quality;
      }

      const response = await openai.images.generate(requestPayload);
      const image = Array.isArray(response?.data) ? response.data[0] : null;

      if (!image) {
        return res
          .status(502)
          .json({ message: 'No image returned from the image provider' });
      }

      const mapPayload = {
        title: deriveMapTitle({
          revisedPrompt: image.revised_prompt,
          prompt: prompt.trim(),
        }),
        prompt: prompt.trim(),
        provider: 'openai',
        model,
        ...(image.url ? { imageUrl: image.url } : {}),
        ...(image.b64_json
          ? {
              imageBase64: image.b64_json,
              imageType:
                typeof image.mime_type === 'string' && image.mime_type.trim() !== ''
                  ? image.mime_type.trim()
                  : 'image/png',
            }
          : {}),
      };

      if (!mapSchemas) {
        return res.json(mapPayload);
      }

      const parsed = mapSchemas.input.safeParse(mapPayload);
      if (!parsed.success) {
        logger.error('Image payload failed schema validation', {
          error: parsed.error?.message,
        });
        return res.status(500).json({ message: 'Generated map was invalid' });
      }

      return res.json(parsed.data);
    } catch (err) {
      logger.error('Failed to generate battle map image', { error: err.message });
      return res.status(500).json({ message: err.message });
    }
  });

  router.use('/ai', aiRouter);
};
