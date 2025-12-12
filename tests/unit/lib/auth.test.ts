// tests/unit/lib/auth.test.ts
/** @jest-environment node */

import { authOptions } from '@/lib/auth'
import { JWT } from 'next-auth/jwt'

// The function to test is not exported, so we need to extract it from the authOptions
const refreshAccessToken = authOptions.callbacks!.jwt!

// Mock global fetch
global.fetch = jest.fn()

describe('NextAuth Configuration: refreshAccessToken', () => {
  const baseToken: JWT = {
    accessToken: 'expired-token',
    refreshToken: 'valid-refresh-token',
    accessTokenExpires: Date.now() - 1000, // Expired
    sub: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    picture: '',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
  })

  it('should return a refreshed token on success', async () => {
    const refreshedTokens = {
      access_token: 'new-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token', // Spotify might return a new one
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(refreshedTokens),
    })

    // The `jwt` callback expects an object with `token` and `account` properties
    const result = await refreshAccessToken({ token: baseToken, account: null })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.any(Object)
    )
    expect(result.accessToken).toBe('new-access-token')
    expect(result.refreshToken).toBe('new-refresh-token')
    expect(result.error).toBeUndefined()
    expect(result.accessTokenExpires).toBeGreaterThan(Date.now())
  })

  it('should retain the old refresh token if a new one is not provided', async () => {
    const refreshedTokens = {
      access_token: 'another-new-token',
      expires_in: 3600,
      // No new refresh token
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(refreshedTokens),
    })

    const result = await refreshAccessToken({ token: baseToken, account: null })

    expect(result.accessToken).toBe('another-new-token')
    expect(result.refreshToken).toBe('valid-refresh-token') // Kept the old one
    expect(result.error).toBeUndefined()
  })

  it('should return a token with an error flag if the refresh fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    })

    const result = await refreshAccessToken({ token: baseToken, account: null })

    expect(result.error).toBe('RefreshAccessTokenError')
    // The old token properties should still be there
    expect(result.accessToken).toBe('expired-token')
  })

  // This test is to get inside the `jwt` function logic to call the refresh token logic
  it('should call refreshAccessToken when token is expired', async () => {
    const expiredToken = { ...baseToken, accessTokenExpires: Date.now() - 1000 }
    const refreshedTokens = {
      access_token: 'refreshed-on-expiry',
      expires_in: 3600,
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(refreshedTokens),
    })

    const result = await authOptions.callbacks!.jwt!({
      token: expiredToken,
      account: null,
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.accessToken).toBe('refreshed-on-expiry')
  })

  it('should not call refreshAccessToken when token is still valid', async () => {
    const validToken = { ...baseToken, accessTokenExpires: Date.now() + 61000 } // Valid for > 60s
    await authOptions.callbacks!.jwt!({ token: validToken, account: null })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
