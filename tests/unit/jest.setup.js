/* eslint-disable @typescript-eslint/no-require-imports */
// tests/unit/jest.setup.js
require('@testing-library/jest-dom')
const fetch = require('node-fetch')

// Mock logger to suppress console output during tests
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock fs for file-based operations if any are left
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // import and retain default behavior
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

// Mock node-fetch for API calls
global.fetch = fetch

// Mock environment variables
process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'

// Mock Prisma Client to prevent DB connection during tests
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    spotifyToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
  }
  // The module is imported as `import * as Prisma from '@prisma/client'`.
  // We need to mock the entire namespace.
  return {
    __esModule: true,
    PrismaClient: jest.fn(() => mPrismaClient),
    // Mock the named export for `SpotifyToken` type. It's a type-only import,
    // so an empty object is sufficient for Jest's module resolution.
    SpotifyToken: {},
  }
})
