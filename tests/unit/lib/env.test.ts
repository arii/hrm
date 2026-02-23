import { z } from 'zod'

describe('Environment Variables', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('should use default values for rate limiting and WebSocket connections', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.SPOTIFY_CLIENT_ID = 'id'
    process.env.SPOTIFY_CLIENT_SECRET = 'secret'
    const { env } = await import('../../../lib/env')
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60000)
    expect(env.SPOTIFY_API_MAX_REQUESTS).toBe(30)
    expect(env.INTERNAL_API_MAX_REQUESTS).toBe(100)
    expect(env.GENERAL_API_MAX_REQUESTS).toBe(200)
    expect(env.WS_MAX_CONNECTIONS).toBe(1000)
  })

  it('should parse environment variables correctly', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.SPOTIFY_CLIENT_ID = 'id'
    process.env.SPOTIFY_CLIENT_SECRET = 'secret'
    process.env.RATE_LIMIT_WINDOW_MS = '120000'
    process.env.SPOTIFY_API_MAX_REQUESTS = '60'
    process.env.INTERNAL_API_MAX_REQUESTS = '200'
    process.env.GENERAL_API_MAX_REQUESTS = '400'
    process.env.WS_MAX_CONNECTIONS = '10'
    process.env.ANALYZE = 'true'
    process.env.TESTING = 'true'
    process.env.IGNORE_BUILD_ERRORS = 'true'
    process.env.npm_package_version = '1.0.0'

    const { env } = await import('../../../lib/env')
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(120000)
    expect(env.SPOTIFY_API_MAX_REQUESTS).toBe(60)
    expect(env.INTERNAL_API_MAX_REQUESTS).toBe(200)
    expect(env.GENERAL_API_MAX_REQUESTS).toBe(400)
    expect(env.WS_MAX_CONNECTIONS).toBe(10)
    expect(env.ANALYZE).toBe(true)
    expect(env.TESTING).toBe(true)
    expect(env.IGNORE_BUILD_ERRORS).toBe(true)
    expect(env.npm_package_version).toBe('1.0.0')
  })

  it('should throw an error for invalid environment variables', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXTAUTH_URL = 'invalid-url'
    process.env.NEXTAUTH_SECRET = 'short'
    process.env.SPOTIFY_CLIENT_ID = 'id'
    process.env.SPOTIFY_CLIENT_SECRET = 'secret'
    await expect(import('../../../lib/env')).rejects.toThrow(z.ZodError)
  })

  it('should derive SPOTIFY_CALLBACK_URL from NEXTAUTH_URL if not provided', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.SPOTIFY_CLIENT_ID = 'id'
    process.env.SPOTIFY_CLIENT_SECRET = 'secret'
    const { env } = await import('../../../lib/env')
    expect(env.SPOTIFY_CALLBACK_URL).toBe(
      'http://localhost:3000/api/auth/callback/spotify'
    )
  })

  it('should throw an error if Spotify credentials are provided but callback URL cannot be determined', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.SPOTIFY_CLIENT_ID = 'id'
    process.env.SPOTIFY_CLIENT_SECRET = 'secret'
    delete process.env.NEXTAUTH_URL
    await expect(import('../../../lib/env')).rejects.toThrow(z.ZodError)
  })

  it('should handle client-side environment correctly', async () => {
    // Simulate client-side environment
    global.window = {} as any
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_TESTING = 'true'
    // Remove server-side secrets that would normally trigger validation errors in production
    delete process.env.NEXTAUTH_SECRET
    delete process.env.NEXTAUTH_URL
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET

    const { env } = await import('../../../lib/env')
    expect(env.NODE_ENV).toBe('production')
    expect(env.NEXT_PUBLIC_TESTING).toBe(true)
    // Server secrets should be missing, but validation should pass on client
    expect(env.NEXTAUTH_SECRET).toBeUndefined()

    // Cleanup global window
    delete (global as any).window
  })
})
