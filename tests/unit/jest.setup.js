/* eslint-env jest */
// tests/unit/jest.setup.js
import '@testing-library/jest-dom'

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

// Mock node-fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({ access_token: 'mock_access_token', expires_in: 3600 }),
    ok: true,
  })
)

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
  return {
    __esModule: true,
    PrismaClient: jest.fn(() => mPrismaClient),
  }
})
