const DEFAULT_SIDES = 20;

const parseNotation = (notation) => {
  if (typeof notation !== 'string') {
    return { count: 1, sides: DEFAULT_SIDES };
  }

  const match = notation.trim().match(/^(\d+)?\s*d\s*(\d+)/i);
  if (!match) {
    return { count: 1, sides: DEFAULT_SIDES };
  }

  const count = Number.parseInt(match[1] || '1', 10);
  const sides = Number.parseInt(match[2] || `${DEFAULT_SIDES}`, 10);

  return {
    count: Number.isFinite(count) && count > 0 ? count : 1,
    sides: Number.isFinite(sides) && sides > 0 ? sides : DEFAULT_SIDES,
  };
};

const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const buildRollGroup = (notation, index) => {
  const { count, sides } = parseNotation(notation);
  const values = Array.from({ length: count }, () => rollDie(sides));
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    id: `stub-group-${index}`,
    rolls: [
      {
        notation,
        count,
        sides,
        values,
        result: total,
        total,
      },
    ],
  };
};

class DiceBoxStub {
  constructor(target, options = {}) {
    this.target = target;
    this.options = options;
    this.onRollComplete = null;
    this.onRollError = null;
  }

  async init() {
    return this;
  }

  clear() {
    // no-op
  }

  updateConfig() {
    // no-op
  }

  roll(notations) {
    const input = Array.isArray(notations) ? notations : [notations];

    try {
      const groups = input
        .filter((notation) => typeof notation === 'string' && notation.trim())
        .map((notation, index) => buildRollGroup(notation, index));

      const payload = { groups };

      if (typeof this.onRollComplete === 'function') {
        // Defer to simulate async behaviour of real dice box
        setTimeout(() => this.onRollComplete(payload), 0);
      }
    } catch (error) {
      if (typeof this.onRollError === 'function') {
        this.onRollError(error);
      } else {
        throw error;
      }
    }
  }
}

export default DiceBoxStub;
