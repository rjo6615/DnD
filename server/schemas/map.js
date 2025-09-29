const createMapSchema = (z) => {
  if (!z || typeof z.object !== 'function') {
    throw new Error('A Zod instance is required to build the map schema');
  }

  const MapSchema = z.object({
    title: z.string(),
    summary: z.string(),
    environment: z.string(),
    cellSizeFeet: z.number(),
    grid: z.array(z.array(z.string())),
    legend: z.array(
      z.object({
        symbol: z.string(),
        description: z.string(),
      })
    ),
  });

  const baseSafeParse = MapSchema.safeParse.bind(MapSchema);

  MapSchema.safeParse = (value) => {
    const parsed = baseSafeParse(value);
    if (!parsed.success) {
      return parsed;
    }

    const map = parsed.data;
    const fail = (message) => ({ success: false, error: { message } });
    const isNonEmptyString = (input) =>
      typeof input === 'string' && input.trim().length > 0;

    if (!isNonEmptyString(map.title)) {
      return fail('title must be a non-empty string');
    }

    if (!isNonEmptyString(map.summary)) {
      return fail('summary must be a non-empty string');
    }

    if (!isNonEmptyString(map.environment)) {
      return fail('environment must be a non-empty string');
    }

    if (map.cellSizeFeet !== 5) {
      return fail('cellSizeFeet must be 5');
    }

    if (!Array.isArray(map.grid) || map.grid.length === 0) {
      return fail('grid must contain at least one row');
    }

    const firstRowLength = Array.isArray(map.grid[0]) ? map.grid[0].length : 0;
    if (firstRowLength === 0) {
      return fail('grid rows must contain at least one cell');
    }

    for (const row of map.grid) {
      if (!Array.isArray(row) || row.length !== firstRowLength) {
        return fail('grid rows must all be the same length');
      }

      for (const cell of row) {
        if (!isNonEmptyString(cell)) {
          return fail('grid cells must be non-empty strings');
        }
      }
    }

    if (!Array.isArray(map.legend) || map.legend.length === 0) {
      return fail('legend must contain at least one entry');
    }

    const seenSymbols = new Set();
    for (const entry of map.legend) {
      if (!entry || typeof entry !== 'object') {
        return fail('legend entries must be objects');
      }

      if (!isNonEmptyString(entry.symbol)) {
        return fail('legend symbols must be non-empty strings');
      }

      if (!isNonEmptyString(entry.description)) {
        return fail('legend descriptions must be non-empty strings');
      }

      if (seenSymbols.has(entry.symbol)) {
        return fail('legend symbols must be unique');
      }

      seenSymbols.add(entry.symbol);
    }

    const allowedSymbols = seenSymbols;
    for (const row of map.grid) {
      for (const cell of row) {
        if (!allowedSymbols.has(cell)) {
          return fail('grid contains symbols not present in the legend');
        }
      }
    }

    return { success: true, data: map };
  };

  return MapSchema;
};

module.exports = createMapSchema;
