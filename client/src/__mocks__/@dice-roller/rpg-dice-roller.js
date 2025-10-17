export class DiceRoller {
  roll(notation) {
    const sanitized = typeof notation === 'string' ? notation.trim() : '';
    const match = sanitized.match(/(\d+)d(\d+)/i);
    const count = match ? Math.max(1, parseInt(match[1], 10) || 1) : 1;
    const sides = match ? Math.max(2, parseInt(match[2], 10) || 20) : 20;
    const values = Array.from({ length: count }, (_, index) => ((index % sides) + 1));
    return {
      rolls: values.map((value) => ({ value })),
      export(format) {
        if (format === 'json') {
          return {
            notation: sanitized || `${count}d${sides}`,
            rolls: values.map((value) => ({ value })),
            total: values.reduce((sum, value) => sum + value, 0),
          };
        }
        return {
          notation: sanitized || `${count}d${sides}`,
          total: values.reduce((sum, value) => sum + value, 0),
        };
      },
    };
  }
}
