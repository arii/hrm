const { jest } = require('@jest/globals')

module.exports = {
  NextResponse: {
    json: jest.fn((body, init) => ({
      body: JSON.stringify(body),
      status: init?.status || 200,
      json: () => Promise.resolve(body),
    })),
  },
}
