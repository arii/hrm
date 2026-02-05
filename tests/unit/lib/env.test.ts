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
    try {
      await import('../../../lib/env')
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as Error).constructor.name).toBe('ZodError')
    }
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
    try {
      await import('../../../lib/env')
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as Error).constructor.name).toBe('ZodError')
    }
  })
})
