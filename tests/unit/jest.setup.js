// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

jest.mock('../../lib/redis', () => ({
  __esModule: true,
  default: {
    hGetAll: jest.fn().mockResolvedValue({}),
    hSet: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../lib/broadcaster', () => ({
  publish: jest.fn(),
  subscribe: jest.fn(),
}));

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
