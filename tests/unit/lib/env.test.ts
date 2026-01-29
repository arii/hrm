import { envSchema } from '../../../lib/env'

describe('envSchema', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    NEXTAUTH_SECRET: 'a-super-secret-key-that-is-long-enough',
    NEXTAUTH_URL: 'http://localhost:3000',
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
    SPOTIFY_CALLBACK_URL: 'http://localhost:3000/api/auth/callback/spotify',
  }

  it('should validate a correct environment', () => {
    const result = envSchema.safeParse(baseEnv)
    expect(result.success).toBe(true)
  })

  describe('WebSocket Variables', () => {
    it('should fail if WEBSOCKET_WATCHDOG_INTERVAL is zero', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        WEBSOCKET_WATCHDOG_INTERVAL: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should fail if WEBSOCKET_WATCHDOG_INTERVAL is negative', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        WEBSOCKET_WATCHDOG_INTERVAL: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should fail if WEBSOCKET_GRACE_PERIOD_MS is zero', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        WEBSOCKET_GRACE_PERIOD_MS: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should fail if WEBSOCKET_GRACE_PERIOD_MS is negative', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        WEBSOCKET_GRACE_PERIOD_MS: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should fail if WS_MAX_CONNECTIONS is zero', () => {
      const result = envSchema.safeParse({ ...baseEnv, WS_MAX_CONNECTIONS: 0 })
      expect(result.success).toBe(false)
    })

    it('should fail if WS_MAX_CONNECTIONS is negative', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        WS_MAX_CONNECTIONS: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should apply default positive values when variables are not set', () => {
      const result = envSchema.safeParse(baseEnv)
      if (!result.success) {
        throw new Error('Schema validation failed unexpectedly')
      }
      expect(result.data.WEBSOCKET_WATCHDOG_INTERVAL).toBe(30000)
      expect(result.data.WEBSOCKET_GRACE_PERIOD_MS).toBe(5000)
      expect(result.data.WS_MAX_CONNECTIONS).toBe(1000)
    })
  })
})
