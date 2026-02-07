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
    let parsedEnv:
      | {
          success: boolean
          data?: z.infer<typeof import('../../../lib/env').envSchema>
          error?: z.ZodError
        }
      | undefined
    let error: unknown

    try {
      // Dynamically import the module to re-evaluate it with the new process.env
      const { envSchema } = await import('../../../lib/env')
      parsedEnv = envSchema?.safeParse(process.env)
    } catch (e: unknown) {
      error = e
      // Use duck typing to check for ZodError because jest.resetModules() can create different instances
      const isZodError =
        e instanceof z.ZodError ||
        (e &&
          typeof e === 'object' &&
          'name' in e &&
          (e as { name: string }).name === 'ZodError') ||
        (e &&
          typeof e === 'object' &&
          'issues' in e &&
          Array.isArray((e as { issues: unknown[] }).issues))

      if (isZodError) {
        parsedEnv = { success: false, error: e as z.ZodError }
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
        SPOTIFY_CLIENT_SECRET: undefined, // Explicitly unset
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      // Check for error properties instead of strict instanceof check
      expect(error).toBeDefined()
      if (error && typeof error === 'object' && 'issues' in error) {
        const issues = (error as z.ZodError).issues
        expect(issues[0]?.message).toBe(
          'SPOTIFY_CLIENT_SECRET is required when SPOTIFY_CLIENT_ID is set.'
        )
      } else {
        expect(true).toBe(false) // Force fail if not error
      }
    })

    it('should fail if SPOTIFY_CLIENT_SECRET is set but SPOTIFY_CLIENT_ID is not', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'development',
        SPOTIFY_CLIENT_ID: undefined, // Explicitly unset
        SPOTIFY_CLIENT_SECRET: 'test-secret',
        NEXTAUTH_SECRET: 'a-valid-secret-for-testing',
        NEXTAUTH_URL: 'http://localhost:3000',
      })
      expect(error).toBeDefined()
      if (error && typeof error === 'object' && 'issues' in error) {
        const issues = (error as z.ZodError).issues
        expect(issues[0]?.message).toBe(
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
      expect(error).toBeDefined()
      if (error && typeof error === 'object' && 'issues' in error) {
        const issues = (error as z.ZodError).issues
        expect(issues[0]?.message).toBe(
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
      expect(error).toBeDefined()
      if (error && typeof error === 'object' && 'issues' in error) {
        const issues = (error as z.ZodError).issues
        expect(issues[0]?.message).toBe('NEXTAUTH_SECRET is required.')
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
      if (parsedEnv?.success) {
        expect(parsedEnv.data?.SPOTIFY_CALLBACK_URL).toBe(
          'http://localhost:3000/api/auth/callback/spotify'
        )
      } else {
        throw new Error('Parsing failed unexpectedly')
      }
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
      if (parsedEnv?.success) {
        expect(parsedEnv.data?.SPOTIFY_CALLBACK_URL).toBe(
          'http://custom-url.com/callback'
        )
      } else {
        throw new Error('Parsing failed unexpectedly')
      }
    })
  })

  describe('Default Values and Parsing', () => {
    it('should use default values for rate limiting and WebSocket connections', async () => {
      const { parsedEnv, error } = await validateEnv({
        NODE_ENV: 'test',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'secret',
      })
      expect(error).toBeUndefined()
      const env = parsedEnv?.data
      expect(env?.RATE_LIMIT_WINDOW_MS).toBe(60000)
      expect(env?.SPOTIFY_API_MAX_REQUESTS).toBe(30)
      expect(env?.INTERNAL_API_MAX_REQUESTS).toBe(100)
      expect(env?.GENERAL_API_MAX_REQUESTS).toBe(200)
      expect(env?.WS_MAX_CONNECTIONS).toBe(1000)
    })

    it('should parse environment variables correctly', async () => {
      const { parsedEnv, error } = await validateEnv({
        NODE_ENV: 'test',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'secret',
        RATE_LIMIT_WINDOW_MS: '120000',
        SPOTIFY_API_MAX_REQUESTS: '60',
        INTERNAL_API_MAX_REQUESTS: '200',
        GENERAL_API_MAX_REQUESTS: '400',
        WS_MAX_CONNECTIONS: '10',
      })
      expect(error).toBeUndefined()
      const env = parsedEnv?.data
      expect(env?.RATE_LIMIT_WINDOW_MS).toBe(120000)
      expect(env?.SPOTIFY_API_MAX_REQUESTS).toBe(60)
      expect(env?.INTERNAL_API_MAX_REQUESTS).toBe(200)
      expect(env?.GENERAL_API_MAX_REQUESTS).toBe(400)
      expect(env?.WS_MAX_CONNECTIONS).toBe(10)
    })

    it('should throw an error for invalid environment variables', async () => {
      const { error } = await validateEnv({
        NODE_ENV: 'test',
        NEXTAUTH_URL: 'invalid-url',
        NEXTAUTH_SECRET: 'secret',
      })
      // Use checks more resilient to module reset issues
      expect(error).toBeDefined()
    })
  })
})
