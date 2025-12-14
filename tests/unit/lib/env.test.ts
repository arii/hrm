// File: tests/unit/lib/env.test.ts
/**
 * @jest-environment node
 */
import { z } from 'zod'

// Mock process.env
const originalEnv = process.env

describe('Environment Variable Validation', () => {
  beforeEach(() => {
    // Reset process.env before each test to ensure isolation
    jest.resetModules()
    // Restore the original environment variables before each test
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv
  })

  it('should pass with all required environment variables set', () => {
    // These are already set by .env.test and loaded by jest.config.cjs
    // This test now simply verifies that a valid environment doesn't throw.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(() => require('../../../lib/env')).not.toThrow()
  })

  it('should use default values for optional environment variables', () => {
    // Set only the required environment variables (which are already set by .env.test)
    // Clear out any optional values that might be set in the test environment
    delete process.env.PORT
    delete process.env.HOST
    delete process.env.SPOTIFY_POLLING_INTERVAL_MS
    // NOTE: We do not delete process.env.NODE_ENV because Jest sets it to 'test'
    // and we want to confirm our schema respects that.

    // Dynamically import the env module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require('../../../lib/env')

    // Check that optional variables have their default values
    // Jest automatically sets NODE_ENV to 'test', which is a valid enum value, so no default is applied.
    expect(env.NODE_ENV).toBe('test')
    expect(env.PORT).toBe(3000)
    expect(env.HOST).toBe('127.0.0.1')
    expect(env.SPOTIFY_POLLING_INTERVAL_MS).toBe(3000)
  })

  it('should correctly parse and transform boolean-like strings', () => {
    // Set required variables and the specific ones to test
    process.env.TESTING = 'true'
    process.env.SPOTIFY_DEBUG = '1'

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require('../../../lib/env')

    expect(env.TESTING).toBe(true)
    expect(env.SPOTIFY_DEBUG).toBe(true)
  })
})
