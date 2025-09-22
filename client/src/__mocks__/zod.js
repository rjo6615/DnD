const makeType = () => ({ optional: () => makeType() });

const z = {
  string: makeType,
  number: makeType,
  enum: () => makeType(),
  array: () => ({ optional: () => makeType() }),
  object: () => ({ safeParse: (data) => ({ success: true, data }) }),
};

module.exports = { z };
