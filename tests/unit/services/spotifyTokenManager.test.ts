// File: tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager } from '../../../services/spotifyTokenManager'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
const mockPrisma = {
  spotifyToken: {
    findFirst: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
  },
}

describe('SpotifyTokenManager', () => {
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'
  let tokenManager: SpotifyTokenManager

  beforeEach(() => {
    jest.clearAllMocks()
    tokenManager = new SpotifyTokenManager(
      clientId,
      clientSecret,
      mockPrisma as unknown as PrismaClient
    )
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should load tokens from the database on initialization', async () => {
    const tokenRecord = {
      id: '1',
      provider: 'spotify',
      sub: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      scope: 'test_scope',
      obtainedAt: new Date(),
      userId: '1',
    }
    mockPrisma.spotifyToken.findFirst.mockResolvedValue(tokenRecord)

    // Re-instantiate to test constructor logic
    tokenManager = new SpotifyTokenManager(
      clientId,
      clientSecret,
      mockPrisma as unknown as PrismaClient
    )

    // wait for loadTokens to complete
    await new Promise(process.nextTick)

    expect(mockPrisma.spotifyToken.findFirst).toHaveBeenCalled()
    expect(tokenManager.getUserId()).toBe('test_user')
  })

  it('should refresh the access token if it is expired', async () => {
    const now = new Date()
    const tokenRecord = {
      id: '1',
      provider: 'spotify',
      sub: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      scope: 'test_scope',
      obtainedAt: new Date(now.getTime() - 3600 * 1000), // Expired
      userId: '1',
    }
    mockPrisma.spotifyToken.findFirst.mockResolvedValue(tokenRecord)
    mockPrisma.spotifyToken.update.mockResolvedValue({
      ...tokenRecord,
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      obtainedAt: new Date(),
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

    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
    expect(mockPrisma.spotifyToken.update).toHaveBeenCalled()
  })

  it('should not refresh the access token if it is still valid', async () => {
    const now = new Date()
    const tokenRecord = {
      id: '1',
      provider: 'spotify',
      sub: 'test_user',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      scope: 'test_scope',
      obtainedAt: now, // Not expired
      userId: '1',
    }
    mockPrisma.spotifyToken.findFirst.mockResolvedValue(tokenRecord)

    global.fetch = jest.fn()

    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('access_token')
  })

  it('should set the access token', async () => {
    const token = 'new_token'
    const userId = 'new_user'
    const email = 'new_user@example.com'
    const user = { id: '1', email }

    mockPrisma.user.upsert.mockResolvedValue(user)
    mockPrisma.spotifyToken.upsert.mockResolvedValue({
      id: '1',
      provider: 'spotify',
      sub: userId,
      accessToken: token,
      refreshToken: '',
      expiresIn: 3600,
      scope: '',
      obtainedAt: new Date(),
      userId: user.id,
    })

    await tokenManager.setAccessToken(token, userId, email)

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { email },
      update: {},
      create: { email },
    })
    expect(mockPrisma.spotifyToken.upsert).toHaveBeenCalled()
  })
})
