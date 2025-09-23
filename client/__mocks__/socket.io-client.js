const mockSockets = [];

const io = jest.fn(() => {
  const socket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  mockSockets.push(socket);
  return socket;
});

const __resetMockSocket = () => {
  mockSockets.length = 0;
};

const __getMockSockets = () => mockSockets;

const __getIoMock = () => io;

module.exports = {
  __esModule: true,
  default: io,
  io,
  __resetMockSocket,
  __getMockSockets,
  __getIoMock,
};
