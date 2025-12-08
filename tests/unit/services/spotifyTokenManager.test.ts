// File: tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager } from '../../../services/spotifyTokenManager'
import { PrismaClient } from '@prisma/client'

// Get the mock client from the global setup
const prisma = new PrismaClient()

describe('SpotifyTokenManager', () => {
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'
  let tokenManager: SpotifyTokenManager

  beforeEach(() => {
    tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    jest.clearAllMocks() // Clear mocks between tests
  })

  it('should load tokens from the database', async () => {
    const tokenRecord = {
      id: '1',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      spotifyUserId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    ;(prisma.spotifyToken.findUnique as jest.Mock).mockResolvedValue(
      tokenRecord
    )

    await tokenManager.loadToken('test-user-id')
    const accessToken = await tokenManager.getValidAccessToken()

    expect(prisma.spotifyToken.findUnique).toHaveBeenCalledWith({
      where: { spotifyUserId: 'test-user-id' },
    })
    expect(accessToken).toBe('access_token')
  })

  it('should refresh the access token if it is expired', async () => {
    const now = new Date()
    const expiredTokenRecord = {
      id: '1',
      accessToken: 'expired_access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(now.getTime() - 1000), // Expired
      spotifyUserId: 'test-user-id',
      createdAt: now,
      updatedAt: now,
    }

    // Mock the DB find to return the expired token
    ;(prisma.spotifyToken.findUnique as jest.Mock).mockResolvedValue(
      expiredTokenRecord
    )

    const refreshedTokenData = {
      access_token: 'new_access_token',
      expires_in: 3600,
      refresh_token: 'new_refresh_token',
    }

    // Mock the fetch call for token refresh
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(refreshedTokenData),
    })

    // Mock the DB update to reflect the new token
    ;(prisma.spotifyToken.update as jest.Mock).mockImplementation(
      async ({ data }) => {
        return { ...expiredTokenRecord, ...data }
      }
    )

    await tokenManager.loadToken('test-user-id')
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(prisma.spotifyToken.update).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
  })

  it('should not refresh the access token if it is still valid', async () => {
    const validTokenRecord = {
      id: '1',
      accessToken: 'valid_access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // Not expired
      spotifyUserId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.spotifyToken.findUnique as jest.Mock).mockResolvedValue(
      validTokenRecord
    )
    global.fetch = jest.fn()

    await tokenManager.loadToken('test-user-id')
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('valid_access_token')
  })
})
