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
    const { env } = await import('../../../lib/env')
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60000)
    expect(env.SPOTIFY_API_MAX_REQUESTS).toBe(30)
    expect(env.INTERNAL_API_MAX_REQUESTS).toBe(100)
    expect(env.GENERAL_API_MAX_REQUESTS).toBe(200)
    expect(env.WS_MAX_CONNECTIONS).toBe(5)
  })

  it('should parse environment variables correctly', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NEXTAUTH_SECRET = 'secret'
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
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.RATE_LIMIT_WINDOW_MS = 'invalid'
    await expect(import('../../../lib/env')).rejects.toThrow(z.ZodError)
  })
})
