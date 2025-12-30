// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
process.env.REDIS_URL = 'redis://localhost:6379'

// Mock Redis client
const mockRedisStore = new Map()
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    hGetAll: jest.fn((key) => {
      const data = mockRedisStore.get(key)
      return data ? { ...data } : {}
    }),
    hSet: jest.fn((key, data) => {
      const existing = mockRedisStore.get(key) || {}
      mockRedisStore.set(key, { ...existing, ...data })
    }),
    del: jest.fn((key) => {
      mockRedisStore.delete(key)
    }),
    scanIterator: jest.fn(function* () {
      for (const key of mockRedisStore.keys()) {
        yield key
      }
    }),
    duplicate: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      quit: jest.fn(),
    })),
    publish: jest.fn(),
  })),
}))

// Mock broadcaster
jest.mock('@/lib/broadcaster', () => ({
  broadcast: jest.fn(),
  subscribe: jest.fn(() => ({
    unsubscribe: jest.fn(),
  })),
}))

// Mock logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  debug: jest.fn(),
}))
