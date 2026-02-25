import { z } from 'zod'

describe('Environment Variables', () => {
  const OLD_ENV = process.env
  const originalWindow = global.window

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    // Ensure we start as "server" by default
    delete global.window
  })

  afterAll(() => {
    process.env = OLD_ENV
    global.window = originalWindow
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
    const { env } = await import('../../../lib/env')
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(120000)
    expect(env.SPOTIFY_API_MAX_REQUESTS).toBe(60)
    expect(env.INTERNAL_API_MAX_REQUESTS).toBe(200)
    expect(env.GENERAL_API_MAX_REQUESTS).toBe(400)
    expect(env.WS_MAX_CONNECTIONS).toBe(10)
  })

  it('should throw an error for invalid environment variables', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_URL = 'invalid-url'
    process.env.NEXTAUTH_SECRET = 'secret'
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

  it('should not throw on client even if server variables are missing', async () => {
    // simulate client
    global.window = {}

    process.env.NODE_ENV = 'test'
    // Missing required server variables
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET

    // Explicitly set some public vars
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test'

    const { env } = await import('../../../lib/env')
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://api.test')
    // checking that it's undefined on client mapping
    expect(env.NEXTAUTH_URL).toBeUndefined()
  })

  it('should still validate public variables on client', async () => {
    // simulate client
    global.window = {}

    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_API_URL = 'invalid-url'

    await expect(import('../../../lib/env')).rejects.toThrow(z.ZodError)
  })
})
