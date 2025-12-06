// File: tests/unit/services/spotifyTokenManager.test.ts
const mockSpotifyTokenDb = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    spotifyToken: mockSpotifyTokenDb,
  })),
}))

import { SpotifyTokenManager } from '../../../services/spotifyTokenManager'

describe('SpotifyTokenManager', () => {
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'
  let tokenManager: SpotifyTokenManager

  beforeEach(() => {
    jest.clearAllMocks()
    mockSpotifyTokenDb.findFirst.mockReset()
    mockSpotifyTokenDb.findUnique.mockReset()
    mockSpotifyTokenDb.upsert.mockReset()
    mockSpotifyTokenDb.update.mockReset()

    tokenManager = new SpotifyTokenManager(clientId, clientSecret)
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should load the first available token', async () => {
    const mockToken = {
      spotifyUserId: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    }
    mockSpotifyTokenDb.findFirst.mockResolvedValue(mockToken)

    const result = await tokenManager.loadFirstAvailableToken()

    expect(result).toBe(true)
    expect(mockSpotifyTokenDb.findFirst).toHaveBeenCalled()
    expect(tokenManager.getUserId()).toBe('test_user')
  })

  it('should return false if no tokens are available', async () => {
    mockSpotifyTokenDb.findFirst.mockResolvedValue(null)

    const result = await tokenManager.loadFirstAvailableToken()

    expect(result).toBe(false)
    expect(mockSpotifyTokenDb.findFirst).toHaveBeenCalled()
  })

  it('should upsert a token', async () => {
    const tokenData = {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresAt: new Date(),
    }
    mockSpotifyTokenDb.upsert.mockResolvedValue({
      ...tokenData,
      spotifyUserId: 'test_user',
    })

    await tokenManager.upsertToken('test_user', tokenData)

    expect(mockSpotifyTokenDb.upsert).toHaveBeenCalledWith({
      where: { spotifyUserId: 'test_user' },
      update: expect.any(Object),
      create: expect.any(Object),
    })
  })

  it('should refresh an expired token', async () => {
    const expiredToken = {
      spotifyUserId: 'test_user',
      accessToken: 'expired_access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: new Date(Date.now() - 1000),
    }
    // Manually set the in-memory token for the test
    ;(tokenManager as any).inMemoryToken = expiredToken
    ;(tokenManager as any).userId = expiredToken.spotifyUserId

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
        }),
    })
    mockSpotifyTokenDb.update.mockResolvedValue({
      ...expiredToken,
      accessToken: 'new_access_token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    })

    const accessToken = await tokenManager.getValidAccessToken()
    expect(global.fetch).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
    expect(mockSpotifyTokenDb.update).toHaveBeenCalled()
  })
})
