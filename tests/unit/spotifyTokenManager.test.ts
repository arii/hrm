// File: tests/unit/spotifyTokenManager.test.ts
import { SpotifyTokenManager, TokenRecord } from '../../services/spotifyTokenManager'
import fs from 'fs'
import path from 'path'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock the entire fs module
jest.mock('fs')

// Mock the global fetch function
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('SpotifyTokenManager', () => {
  const logDir = '/tmp/logs'
  const tokenFile = path.join(logDir, 'spotify_tokens.json')
  const clientId = 'test-client-id'
  const clientSecret = 'test-client-secret'

  let tokenManager: SpotifyTokenManager

  const mockTokenRecord: TokenRecord = {
    receivedAt: Date.now() - 3600 * 1000, // 1 hour ago
    payload: {
      provider: 'spotify',
      sub: 'test-user',
      access_token: 'initial-access-token',
      refresh_token: 'initial-refresh-token',
      expires_in: 3600,
      scope: 'user-read-private',
      obtainedAt: Date.now() - 3600 * 1000,
    },
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should load tokens from file on initialization', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockTokenRecord))

    tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)

    expect(fs.existsSync).toHaveBeenCalledWith(tokenFile)
    expect(fs.readFileSync).toHaveBeenCalledWith(tokenFile, 'utf8')
    expect(tokenManager.getUserId()).toBe('test-user')
  })

  it('should handle non-existent token file gracefully', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)

    tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)

    expect(tokenManager.getUserId()).toBeNull()
  })

  it('should return a valid access token without refreshing if not expired', async () => {
    const validTokenRecord: TokenRecord = {
      ...mockTokenRecord,
      payload: {
        ...mockTokenRecord.payload,
        obtainedAt: Date.now() - 1800 * 1000, // 30 minutes ago
      },
    }
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(validTokenRecord))

    tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(accessToken).toBe('initial-access-token')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should refresh the token if it is close to expiring', async () => {
    const expiringTokenRecord: TokenRecord = {
      ...mockTokenRecord,
      payload: {
        ...mockTokenRecord.payload,
        obtainedAt: Date.now() - 3590 * 1000, // 59 minutes and 50 seconds ago
      },
    }
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(expiringTokenRecord))

    const refreshedToken = {
      access_token: 'refreshed-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token',
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => refreshedToken,
    })

    tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.any(Object)
    )
    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(accessToken).toBe('refreshed-access-token')
  })

  it('should handle token refresh failure', async () => {
    const expiredTokenRecord: TokenRecord = {
      ...mockTokenRecord,
      payload: {
        ...mockTokenRecord.payload,
        obtainedAt: Date.now() - 3700 * 1000, // Expired
      },
    }
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(expiredTokenRecord))

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })

    tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    await tokenManager.getValidAccessToken()

    // The token should not be updated on failure
    expect(tokenManager.getSdkAccessToken()?.access_token).toBe('initial-access-token')
  })

  it('should correctly construct the SDK AccessToken object', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockTokenRecord))

    tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const sdkToken = tokenManager.getSdkAccessToken()

    expect(sdkToken).toEqual({
      access_token: 'initial-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'initial-refresh-token',
      expires: mockTokenRecord.payload.obtainedAt + 3600 * 1000,
    })
  })
})
