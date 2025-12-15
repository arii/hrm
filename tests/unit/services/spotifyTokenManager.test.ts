// tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager } from '../../../services/spotifyTokenManager'
import { PrismaClient } from '@prisma/client'

jest.mock('@prisma/client')

const mockPrisma = new PrismaClient()

describe('SpotifyTokenManager', () => {
  let tokenManager: SpotifyTokenManager

  beforeEach(() => {
    jest.clearAllMocks()
    tokenManager = new SpotifyTokenManager(
      'test-client-id',
      'test-client-secret',
      mockPrisma
    )
  })

  it('should return null if no account is found', async () => {
    ;(mockPrisma.account.findFirst as jest.Mock).mockResolvedValue(null)
    const token = await tokenManager.getValidAccessToken()
    expect(token).toBeNull()
  })

  it('should return access token if valid', async () => {
    const future = new Date()
    future.setHours(future.getHours() + 1)
    const expires_at = Math.floor(future.getTime() / 1000)

    ;(mockPrisma.account.findFirst as jest.Mock).mockResolvedValue({
      access_token: 'valid-access-token',
      refresh_token: 'valid-refresh-token',
      expires_at: expires_at,
      token_type: 'Bearer',
      scope: 'user-read-private',
    })

    const token = await tokenManager.getValidAccessToken()
    expect(token).toBe('valid-access-token')
  })

  it('should refresh token if expired', async () => {
    const past = new Date()
    past.setHours(past.getHours() - 1)
    const expires_at = Math.floor(past.getTime() / 1000)

    ;(mockPrisma.account.findFirst as jest.Mock).mockResolvedValue({
      access_token: 'expired-access-token',
      refresh_token: 'valid-refresh-token',
      expires_at: expires_at,
    })

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'user-read-private',
          }),
      })
    ) as jest.Mock

    const token = await tokenManager.getValidAccessToken()
    expect(token).toBe('new-access-token')
    expect(mockPrisma.account.updateMany).toHaveBeenCalled()
  })
})
