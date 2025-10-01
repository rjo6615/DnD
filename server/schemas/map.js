const createMapSchema = (z) => {
  if (!z || typeof z.object !== 'function') {
    throw new Error('A Zod instance is required to build the map schema');
  }

  const isIsoDateString = (value) => {
    if (typeof value !== 'string') {
      return false;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed);
  };

  const buildBaseShape = () => ({
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
    cloudinaryPublicId: z.string().trim().min(1).optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    provider: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
  });

  const applyPostProcessing = (schema) => {
    const baseSafeParse = schema.safeParse.bind(schema);

    schema.safeParse = (value, ...rest) => {
      const parsed = baseSafeParse(value, ...rest);
      if (!parsed.success) {
        return parsed;
      }

      const map = { ...parsed.data };
      const fail = (message) => ({ success: false, error: { message } });

      const hasUrl = typeof map.imageUrl === 'string' && map.imageUrl.trim() !== '';
      const hasBase64 =
        typeof map.imageBase64 === 'string' && map.imageBase64.trim() !== '';

      if (!hasUrl && !hasBase64) {
        return fail('Either imageUrl or imageBase64 must be provided');
      }

      if (hasUrl) {
        map.imageUrl = map.imageUrl.trim();
      }

      if (hasBase64) {
        const base64Value = map.imageBase64.trim();
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        if (!base64Pattern.test(base64Value)) {
          return fail('imageBase64 must be a valid base64 string');
        }
        map.imageBase64 = base64Value;
      }

      if (!map.altText) {
        const derivedAltText = map.title || map.prompt;
        if (derivedAltText && typeof derivedAltText === 'string') {
          map.altText = derivedAltText;
        } else {
          map.altText = 'Dungeons & Dragons battle map';
        }
      }

      if (map.altText && typeof map.altText === 'string') {
        const trimmed = map.altText.trim();
        map.altText = trimmed || 'Dungeons & Dragons battle map';
      }

      if (map.imageType && typeof map.imageType === 'string') {
        const trimmedType = map.imageType.trim();
        if (trimmedType.length === 0) {
          delete map.imageType;
        } else {
          map.imageType = trimmedType;
        }
      }

      if (
        map.cloudinaryPublicId &&
        typeof map.cloudinaryPublicId === 'string'
      ) {
        const trimmedId = map.cloudinaryPublicId.trim();
        if (trimmedId) {
          map.cloudinaryPublicId = trimmedId;
        } else {
          delete map.cloudinaryPublicId;
        }
      }

      return { success: true, data: map };
    };

    return schema;
  };

  const isoString = z.string().trim().min(1);

  const inputSchema = applyPostProcessing(z.object(buildBaseShape()).passthrough());

  const storedSchema = applyPostProcessing(
    z
      .object({
        ...buildBaseShape(),
        mapId: z.string().trim().min(1),
        createdAt: isoString,
        updatedAt: isoString,
      })
      .passthrough()
  );

  return { input: inputSchema, stored: storedSchema };
};

module.exports = createMapSchema;
