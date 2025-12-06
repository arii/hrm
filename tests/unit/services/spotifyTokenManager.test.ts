
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    spotifyToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

// Mock fs
jest.mock('fs')

describe('SpotifyTokenManager', () => {
  const clientId = 'client_id'
  const clientSecret = 'client_secret'
  const logDir = '/tmp/logs'
  const tokenFile = path.join(logDir, 'spotify_tokens.json')

  beforeEach(() => {
    jest.clearAllMocks()
    // Default fetch mock
    global.fetch = jest.fn()
  })

  it('should load tokens from DB on initialization', async () => {
    const mockToken = {
        updatedAt: new Date(),
        spotifyUserId: 'test_user',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000)
    };
    (prisma.spotifyToken.findFirst as jest.Mock).mockResolvedValue(mockToken)

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)

    // Allow async loadTokens to complete
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(prisma.spotifyToken.findFirst).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' }
    })
    expect(tokenManager.getUserId()).toBe('test_user')
  })

  it('should refresh the access token if it is expired', async () => {
     const expiredToken = {
        updatedAt: new Date(),
        spotifyUserId: 'test_user',
        accessToken: 'old_access_token',
        refreshToken: 'refresh_token',
        // Expired 1 hour ago
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000)
    };
    (prisma.spotifyToken.findFirst as jest.Mock).mockResolvedValue(expiredToken);
    (prisma.spotifyToken.update as jest.Mock).mockResolvedValue({
        ...expiredToken,
        accessToken: 'new_access_token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000)
    });

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)

    // Mock successful refresh response
    const mockResponse = {
      ok: true,
      json: async () => ({
        access_token: 'new_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new_refresh_token',
        scope: 'scope',
      }),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    // Force load and refresh
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
    expect(prisma.spotifyToken.update).toHaveBeenCalled()
  })

  it('should not refresh the access token if it is still valid', async () => {
      const validToken = {
        updatedAt: new Date(),
        spotifyUserId: 'test_user',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        // Valid for 1 hour
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000)
    };
    (prisma.spotifyToken.findFirst as jest.Mock).mockResolvedValue(validToken);

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('access_token')
  })
})
