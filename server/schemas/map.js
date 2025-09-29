const createMapSchema = (z) => {
  if (!z || typeof z.object !== 'function') {
    throw new Error('A Zod instance is required to build the map schema');
  }

  const MapSchema = z
    .object({
      title: z.string().trim().min(1).optional(),
      summary: z.string().trim().min(1).optional(),
      caption: z.string().trim().min(1).optional(),
      altText: z.string().trim().min(1).optional(),
      prompt: z.string().trim().min(1).optional(),
      imageUrl: z.string().trim().url().optional(),
      imageBase64: z
        .string()
        .trim()
        .min(1)
        .regex(/^[A-Za-z0-9+/=]+$/, 'imageBase64 must be a base64-encoded string')
        .optional(),
      imageType: z.string().trim().min(1).optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      provider: z.string().trim().min(1).optional(),
      model: z.string().trim().min(1).optional(),
    })
    .passthrough();

  const baseSafeParse = MapSchema.safeParse.bind(MapSchema);

  MapSchema.safeParse = (value) => {
    const parsed = baseSafeParse(value);
    if (!parsed.success) {
      return parsed;
    }

    const map = parsed.data;
    const fail = (message) => ({ success: false, error: { message } });

    const hasUrl = typeof map.imageUrl === 'string' && map.imageUrl.trim() !== '';
    const hasBase64 =
      typeof map.imageBase64 === 'string' && map.imageBase64.trim() !== '';

    if (!hasUrl && !hasBase64) {
      return fail('Either imageUrl or imageBase64 must be provided');
    }

    if (hasBase64) {
      const base64Pattern = /^[A-Za-z0-9+/=]+$/;
      if (!base64Pattern.test(map.imageBase64.trim())) {
        return fail('imageBase64 must be a valid base64 string');
      }
    }

    if (!map.altText) {
      const derivedAltText = map.title || map.summary || map.caption || map.prompt;
      if (derivedAltText && typeof derivedAltText === 'string') {
        map.altText = derivedAltText;
      } else {
        map.altText = 'Dungeons & Dragons battle map';
      }
    }

    if (map.imageType && typeof map.imageType === 'string') {
      map.imageType = map.imageType.trim();
      if (map.imageType.length === 0) {
        delete map.imageType;
      }
    }

    return { success: true, data: map };
  };

  return MapSchema;
};

module.exports = createMapSchema;
