// File: tests/unit/services/spotifyTokenManager.test.ts
import { jest } from '@jest/globals'
import {
  SpotifyTokenManager,
  SpotifyTokenPayload,
} from '../../../services/spotifyTokenManager'
import logger from '../../../utils/logger'

// Mock the logger module
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('SpotifyTokenManager (In-Memory)', () => {
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'
  let tokenManager: SpotifyTokenManager

  const getMockTokenPayload = (overrides: Partial<SpotifyTokenPayload> = {}): SpotifyTokenPayload => ({
    provider: 'spotify',
    sub: 'test_user',
    access_token: 'initial_access_token',
    refresh_token: 'initial_refresh_token',
    expires_in: 3600,
    scope: 'test_scope',
    obtainedAt: Date.now(),
    ...overrides,
  })

  beforeEach(() => {
    tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    global.fetch = jest.fn()
    // Clear all mocks before each test, including the logger
    jest.clearAllMocks()
  })

  it('should start with no token', async () => {
    const accessToken = await tokenManager.getValidAccessToken()
    expect(accessToken).toBeNull()
  })

  it('should update the token in memory and log the action', async () => {
    const payload = getMockTokenPayload()
    tokenManager.updateToken(payload)

    const accessToken = await tokenManager.getValidAccessToken()
    expect(accessToken).toBe('initial_access_token')
    expect(logger.info).toHaveBeenCalledWith({ userId: 'test_user' }, 'Updated in-memory Spotify tokens.')
  })

  it('should not refresh a valid token', async () => {
    const payload = getMockTokenPayload({ obtainedAt: Date.now() }) // Not expired
    tokenManager.updateToken(payload)

    await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should refresh an expired token', async () => {
    const payload = getMockTokenPayload({
      obtainedAt: Date.now() - 3601 * 1000, // Expired over an hour ago
    })
    tokenManager.updateToken(payload)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
        }),
    })

    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
  })

  it('should handle token refresh failure gracefully', async () => {
    const payload = getMockTokenPayload({
      obtainedAt: Date.now() - 3601 * 1000, // Expired
    })
    tokenManager.updateToken(payload)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalledTimes(3) // Check for retry logic
    expect(accessToken).toBe('initial_access_token') // Returns the old, expired token
    expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'test_user', attempt: 3 }),
        expect.stringContaining('Failed to refresh Spotify token')
    )
  })

  it('should only refresh the token once when called concurrently', async () => {
    const payload = getMockTokenPayload({
      obtainedAt: Date.now() - 3601 * 1000, // Expired
    })
    tokenManager.updateToken(payload)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
        }),
    })

    // Simulate 5 concurrent calls
    const promises = Array(5).fill(0).map(() => tokenManager.getValidAccessToken())
    const results = await Promise.all(promises)

    // All results should be the new token
    results.forEach(token => expect(token).toBe('new_access_token'))

    // But fetch should only have been called once
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should not refresh if no refresh token is available', async () => {
    const payload = getMockTokenPayload({
      refresh_token: '', // No refresh token
      obtainedAt: Date.now() - 3601 * 1000, // Expired
    })
    tokenManager.updateToken(payload)

    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('initial_access_token') // Returns the old, expired token
    expect(logger.warn).toHaveBeenCalledWith(
        { userId: 'test_user' },
      'Spotify access token expired, but no refresh token available. Cannot refresh.'
    )
  })

  it('should return a valid SDK AccessToken object', () => {
    const now = Date.now()
    const payload = getMockTokenPayload({ obtainedAt: now })
    tokenManager.updateToken(payload)

    const sdkToken = tokenManager.getSdkAccessToken()

    expect(sdkToken).not.toBeNull()
    expect(sdkToken).toEqual({
      access_token: 'initial_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'initial_refresh_token',
      expires: now + 3600 * 1000,
    })
  })

  it('should return null for SDK token if no token is set', () => {
    const sdkToken = tokenManager.getSdkAccessToken()
    expect(sdkToken).toBeNull()
  })
})
