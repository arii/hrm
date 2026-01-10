/**
 * @jest-environment node
 */
import { authOptions } from '@/lib/auth'
import * as spotify from '@/lib/spotify'
import { Account } from 'next-auth'
import { JWT } from 'next-auth/jwt'

// Mock the spotify module
jest.mock('@/lib/spotify', () => ({
  refreshSpotifyToken: jest.fn(),
}))

// Mock the logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

global.fetch = jest.fn()

describe('authOptions.callbacks.jwt', () => {
  const jwtCallback = authOptions.callbacks?.jwt

  if (!jwtCallback) {
    throw new Error('JWT callback is not defined in authOptions')
  }

  const baseToken: JWT = {
    name: 'Test User',
    email: 'test@example.com',
    sub: '12345',
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should handle initial sign-in correctly', async () => {
    const account = {
      provider: 'spotify',
      providerAccountId: 'spotify-user-id',
      access_token: 'initial-access-token',
      refresh_token: 'initial-refresh-token',
      expires_in: 3600,
    }
    const token = { ...baseToken }

    // Mock the fetch call for token delivery
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    })

    const result = await jwtCallback({ token, account: account as Account })

    expect(result.accessToken).toBe(account.access_token)
    expect(result.refreshToken).toBe(account.refresh_token)
    expect(result.providerAccountId).toBe(account.providerAccountId)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('internal/token-delivery'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(account.providerAccountId),
      })
    )
  })

  it('should return the token if it is still valid', async () => {
    const token: JWT = {
      ...baseToken,
      accessToken: 'valid-access-token',
      accessTokenExpires: Date.now() + 120000, // Expires in 120 seconds
    }

    const result = await jwtCallback({ token, account: null })

    expect(result).toBe(token)
    expect(spotify.refreshSpotifyToken).not.toHaveBeenCalled()
  })

  it('should refresh the token if it is expired', async () => {
    const token: JWT = {
      ...baseToken,
      accessToken: 'expired-access-token',
      refreshToken: 'current-refresh-token',
      accessTokenExpires: Date.now() - 1000, // Expired 1 second ago
      providerAccountId: 'spotify-user-id',
    }
    const refreshedTokens = {
      access_token: 'refreshed-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token',
    }

    ;(spotify.refreshSpotifyToken as jest.Mock).mockResolvedValue(
      refreshedTokens
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    })

    const result = await jwtCallback({ token, account: null })

    expect(spotify.refreshSpotifyToken).toHaveBeenCalledWith(token.refreshToken)
    expect(result.accessToken).toBe(refreshedTokens.access_token)
    expect(result.refreshToken).toBe(refreshedTokens.refresh_token)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('internal/token-delivery'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(refreshedTokens.access_token),
      })
    )
  })

  it('should return an error if token refresh fails', async () => {
    const token: JWT = {
      ...baseToken,
      accessToken: 'expired-access-token',
      refreshToken: 'current-refresh-token',
      accessTokenExpires: Date.now() - 1000,
    }

    ;(spotify.refreshSpotifyToken as jest.Mock).mockRejectedValue(
      new Error('Refresh failed')
    )

    const result = await jwtCallback({ token, account: null })

    expect(result.error).toBe('RefreshAccessTokenError')
    expect(fetch).not.toHaveBeenCalled()
  })
})
