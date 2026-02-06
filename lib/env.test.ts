import { z } from 'zod'

// Mock the console.error before any imports
const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {})

describe('Environment Schema Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    process.env = originalEnv
    mockConsoleError.mockRestore()
  })

  // Helper function to dynamically import and test the schema
  const validateEnv = async (env: NodeJS.ProcessEnv) => {
    process.env = { ...originalEnv, ...env }
    let parsedEnv: { success: boolean; error?: z.ZodError } | undefined
    let error: unknown

    try {
      // Dynamically import the module to re-evaluate it with the new process.env
      const { envSchema } = await import('../lib/env')
      parsedEnv = envSchema?.safeParse(process.env)
    } catch (e) {
      error = e
      if (e instanceof z.ZodError) {
        parsedEnv = { success: false, error: e }
      } else {
        throw e // Re-throw unexpected errors
      }
    }

    return { parsedEnv, error }
  }

  describe('Spotify Credentials', () => {
    it('should fail if SPOTIFY_CLIENT_ID is set but SPOTIFY_CLIENT_SECRET is not', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'development',
        SPOTIFY_CLIENT_ID: 'test-id',
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeInstanceOf(z.ZodError)
      if (error instanceof z.ZodError) {
        expect(error.issues[0]?.message).toBe(
          'SPOTIFY_CLIENT_SECRET is required when SPOTIFY_CLIENT_ID is set.'
        )
      }
    })

    it('should fail if SPOTIFY_CLIENT_SECRET is set but SPOTIFY_CLIENT_ID is not', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'development',
        SPOTIFY_CLIENT_SECRET: 'test-secret',
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeInstanceOf(z.ZodError)
      if (error instanceof z.ZodError) {
        expect(error.issues[0]?.message).toBe(
          'SPOTIFY_CLIENT_ID is required when SPOTIFY_CLIENT_SECRET is set.'
        )
      }
    })

    it('should succeed if both SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'development',
        SPOTIFY_CLIENT_ID: 'test-id',
        SPOTIFY_CLIENT_SECRET: 'test-secret',
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeUndefined()
    })
  })

  describe('NEXTAUTH_SECRET', () => {
    it('should fail in production if NEXTAUTH_SECRET is less than 32 characters', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'short-secret',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeInstanceOf(z.ZodError)
      if (error instanceof z.ZodError) {
        expect(error.issues[0]?.message).toBe(
          'NEXTAUTH_SECRET must be at least 32 characters long in production.'
        )
      }
    })

    it('should succeed in production if NEXTAUTH_SECRET is at least 32 characters', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'a-very-long-and-secure-secret-for-production-env',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeUndefined()
    })

    it('should fail in development if NEXTAUTH_SECRET is empty', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'development',
        NEXTAUTH_SECRET: '',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeInstanceOf(z.ZodError)
      if (error instanceof z.ZodError) {
        expect(error.issues[0]?.message).toBe('NEXTAUTH_SECRET is required.')
      }
    })

    it('should succeed in development if NEXTAUTH_SECRET is not empty', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'development',
        NEXTAUTH_SECRET: 'a-secret',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeUndefined()
    })
  })

  describe('SPOTIFY_CALLBACK_URL', () => {
    it('should derive SPOTIFY_CALLBACK_URL from NEXTAUTH_URL when missing', async () => {
      const { parsedEnv, error } = await validateEnv({
        NODE_ENV: 'development',
        SPOTIFY_CLIENT_ID: 'test-id',
        SPOTIFY_CLIENT_SECRET: 'test-secret',
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeUndefined()
      // @ts-expect-error - parsedEnv is inferred as possibly undefined or having error
      expect(parsedEnv?.data?.SPOTIFY_CALLBACK_URL).toBe(
        'http://localhost:3000/api/auth/callback/spotify'
      )
    })

    it('should use provided SPOTIFY_CALLBACK_URL if present', async () => {
      const { parsedEnv, error } = await validateEnv({
        NODE_ENV: 'development',
        SPOTIFY_CLIENT_ID: 'test-id',
        SPOTIFY_CLIENT_SECRET: 'test-secret',
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
        SPOTIFY_CALLBACK_URL: 'http://custom-url.com/callback',
      })
      expect(error).toBeUndefined()
      // @ts-expect-error - parsedEnv is inferred as possibly undefined or having error
      expect(parsedEnv?.data?.SPOTIFY_CALLBACK_URL).toBe(
        'http://custom-url.com/callback'
      )
    })
  })
})
