/**
 * @jest-environment node
 */
import {
  buildTokenSyncPayload,
  syncTokenToBackend,
} from '@/lib/spotify/tokenSync'
import type { JWT } from 'next-auth/jwt'

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}))

global.fetch = jest.fn()
const mockedFetch = global.fetch as jest.Mock

const baseToken = {
  providerAccountId: 'spotify-user-1',
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  accessTokenExpires: Date.now() + 3600 * 1000,
  scope: 'streaming',
} as JWT

describe('spotify tokenSync', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('buildTokenSyncPayload', () => {
    it('builds the delivery payload from a JWT', () => {
      const payload = buildTokenSyncPayload(baseToken)
      expect(payload).toMatchObject({
        provider: 'spotify',
        sub: 'spotify-user-1',
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        scope: 'streaming',
      })
      expect(payload.expires_in).toBeGreaterThan(3500)
      expect(payload.expires_in).toBeLessThanOrEqual(3600)
      expect(payload.obtainedAt).toBeLessThanOrEqual(Date.now())
    })

    it('defaults scope to empty string', () => {
      const { scope: _omit, ...rest } = baseToken as Record<string, unknown>
      expect(buildTokenSyncPayload(rest as JWT).scope).toBe('')
    })
  })

  describe('syncTokenToBackend', () => {
    it('POSTs the payload with the internal secret', async () => {
      mockedFetch.mockResolvedValue({ ok: true })

      await syncTokenToBackend(baseToken)

      expect(mockedFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockedFetch.mock.calls[0]
      expect(url).toContain('internal/token-delivery')
      expect(init.method).toBe('POST')
      expect(init.headers['x-internal-token-secret']).toBeTruthy()
      const body = JSON.parse(init.body)
      expect(body.access_token).toBe('access-123')
      expect(body.refresh_token).toBe('refresh-456')
    })

    it('skips the sync when tokens are missing', async () => {
      await syncTokenToBackend({} as JWT)
      expect(mockedFetch).not.toHaveBeenCalled()
    })

    it('never throws on delivery failure', async () => {
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      })
      await expect(syncTokenToBackend(baseToken)).resolves.toBeUndefined()

      mockedFetch.mockRejectedValue(new Error('network down'))
      await expect(syncTokenToBackend(baseToken)).resolves.toBeUndefined()
    })
  })
})
