// File: tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager } from '../../../services/spotifyTokenManager'
import { PrismaClient } from '@prisma/client'

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    spotifyToken: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  }
  return { PrismaClient: jest.fn(() => mPrismaClient) }
})

describe('SpotifyTokenManager', () => {
  let prisma: PrismaClient
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should load token from DB on initialization', async () => {
    const tokenRecord = {
      id: '1',
      spotifyUserId: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      scope: 'test_scope',
      updatedAt: new Date(),
    }
    ;(prisma.spotifyToken.findFirst as jest.Mock).mockResolvedValue(tokenRecord)

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    await tokenManager.getValidAccessToken()
    expect(prisma.spotifyToken.findFirst).toHaveBeenCalled()
    expect(tokenManager.getUserId()).toBe('test_user')
  })

  it('should refresh the access token if it is expired', async () => {
    const now = new Date()
    const tokenRecord = {
      id: '1',
      spotifyUserId: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(now.getTime() - 1000), // Expired
      scope: 'test_scope',
      updatedAt: now,
    }
    ;(prisma.spotifyToken.findFirst as jest.Mock).mockResolvedValue(tokenRecord)
    ;(prisma.spotifyToken.update as jest.Mock).mockResolvedValue({
      ...tokenRecord,
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    })

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
        }),
    })

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
    expect(prisma.spotifyToken.update).toHaveBeenCalled()
  })

  it('should not refresh the access token if it is still valid', async () => {
    const now = new Date()
    const tokenRecord = {
      id: '1',
      spotifyUserId: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(now.getTime() + 3600 * 1000), // Not expired
      scope: 'test_scope',
      updatedAt: now,
    }
    ;(prisma.spotifyToken.findFirst as jest.Mock).mockResolvedValue(tokenRecord)

    global.fetch = jest.fn()

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('access_token')
  })
})
