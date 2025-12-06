import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import * as Prisma from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { jest } from '@jest/globals'

// Get the mock client from the manual mock
const prismaMock =
  new (Prisma as jest.Mocked<typeof Prisma>).PrismaClient() as jest.Mocked<Prisma.PrismaClient>

describe('SpotifyTokenManager', () => {
  const clientId = 'test-client-id'
  const clientSecret = 'test-client-secret'
  const userId = 'test-user-id'
  const mockToken: Prisma.SpotifyToken = {
    id: 1,
    spotifyUserId: userId,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)
  })

  it('should load token from database', async () => {
    prismaMock.spotifyToken.findUnique.mockResolvedValue(mockToken)

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    await tokenManager.loadToken(userId)

    expect(prismaMock.spotifyToken.findUnique).toHaveBeenCalledWith({
      where: { spotifyUserId: userId },
    })
    expect(await tokenManager.getValidAccessToken()).toBe('test-access-token')
  })

  it('should refresh token if expired', async () => {
    const expiredToken = {
      ...mockToken,
      accessTokenExpiresAt: new Date(Date.now() - 1000),
    }
    prismaMock.spotifyToken.findUnique.mockResolvedValue(expiredToken)
    prismaMock.spotifyToken.update.mockResolvedValue({
      ...expiredToken,
      accessToken: 'new-access-token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    })

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            expires_in: 3600,
          }),
      })
    ) as jest.Mock

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    await tokenManager.loadToken(userId)
    const newToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(newToken).toBe('new-access-token')
  })

  it('should handle token refresh failure', async () => {
    const expiredToken = {
      ...mockToken,
      accessTokenExpiresAt: new Date(Date.now() - 1000),
    }
    prismaMock.spotifyToken.findUnique.mockResolvedValue(expiredToken)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        text: () => Promise.resolve('error'),
      })
    ) as jest.Mock

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    await tokenManager.loadToken(userId)
    const token = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(token).toBe('test-access-token') // Should return the old token
  })
})
