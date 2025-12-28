// tests/unit/mocks/msw.js
module.exports = {
  rest: {
    get: jest.fn(),
  },
  setupServer: jest.fn(() => ({
    listen: jest.fn(),
    resetHandlers: jest.fn(),
    close: jest.fn(),
  })),
}
