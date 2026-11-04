/**
 * @jest-environment node
 */
import { GET } from '@/app/api/debug/spotify-token-status/route'
import { debugAccessDenied } from '@/lib/debug-guard'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'

jest.mock('@/lib/debug-guard', () => ({
  debugAccessDenied: jest.fn(),
}))

jest.mock('@/services/spotifyTokenManager', () => ({
  SpotifyTokenManager: jest.fn(),
}))

const mockedDebugAccessDenied = debugAccessDenied as jest.Mock
const MockedTokenManager = SpotifyTokenManager as jest.Mock

describe('GET /api/debug/spotify-token-status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDebugAccessDenied.mockReturnValue(null)
    MockedTokenManager.mockImplementation(() => ({ currentToken: null }))
  })

  it('returns the denial response when debug access is denied', async () => {
    const denied = Response.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
    mockedDebugAccessDenied.mockReturnValue(denied)

    const response = await GET()
    expect(response.status).toBe(403)
    expect(MockedTokenManager).not.toHaveBeenCalled()
  })

  it('reports no_token_found without a current token', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'no_token_found',
    })
  })

  it('reports a masked live token', async () => {
    const obtainedAt = Date.now() - 1000
    MockedTokenManager.mockImplementation(() => ({
      currentToken: {
        payload: {
          sub: 'user-1',
          access_token: 'ACCESS_TOKEN_456',
          refresh_token: 'REFRESH_TOKEN_123',
          expires_in: 3600,
          obtainedAt,
        },
      },
    }))

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      status: 'token_found',
      userId: 'user-1',
      accessToken: 'ACCES...',
      refreshToken: 'REFRE...N_123',
      expiresIn: 3600,
      obtainedAt: new Date(obtainedAt).toISOString(),
      expiresAt: new Date(obtainedAt + 3600 * 1000).toISOString(),
      isExpired: false,
      willExpireSoon: false,
    })
  })

  it('flags expired and soon-expiring tokens', async () => {
    MockedTokenManager.mockImplementation(() => ({
      currentToken: {
        payload: {
          sub: 'user-1',
          access_token: 'ACCESS_TOKEN_456',
          refresh_token: '',
          expires_in: 3600,
          obtainedAt: Date.now() - 7200 * 1000,
        },
      },
    }))
    const expired = await (await GET()).json()
    expect(expired.isExpired).toBe(true)
    expect(expired.willExpireSoon).toBe(true)
    expect(expired.refreshToken).toBe('N/A')

    MockedTokenManager.mockImplementation(() => ({
      currentToken: {
        payload: {
          sub: 'user-1',
          access_token: 'ACCESS_TOKEN_456',
          refresh_token: '',
          expires_in: 3600,
          obtainedAt: Date.now() - 3570 * 1000,
        },
      },
    }))
    const soon = await (await GET()).json()
    expect(soon.isExpired).toBe(false)
    expect(soon.willExpireSoon).toBe(true)
  })

  it('returns 500 on unexpected errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      MockedTokenManager.mockImplementation(() => {
        throw new Error('boom')
      })
      const response = await GET()
      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        status: 'error',
        message: 'boom',
      })
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
