const mockParse = jest.fn();

const OpenAI = jest.fn(() => ({
  responses: { parse: mockParse },
}));

module.exports = OpenAI;
module.exports.mockParse = mockParse;
