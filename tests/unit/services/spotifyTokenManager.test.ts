// File: tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { db } from '@/lib/db'

// Mock the db client from the setup file
const mockDb = db as jest.Mocked<typeof db>

describe('SpotifyTokenManager', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return the access token for the designated system token', async () => {
    const mockAccount = {
      id: '1',
      userId: 'user1',
      provider: 'spotify',
      isSystemToken: true,
      access_token: 'system_access_token',
      // ... other account fields
    }
    mockDb.account.findFirst.mockResolvedValue(mockAccount as any)

    const accessToken = await SpotifyTokenManager.getSystemAccessToken()

    expect(mockDb.account.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'spotify',
        isSystemToken: true,
      },
    })
    expect(accessToken).toBe('system_access_token')
  })

  it('should fall back to the first available Spotify account if no system token is designated', async () => {
    const mockAccount = {
      id: '2',
      userId: 'user2',
      provider: 'spotify',
      isSystemToken: false,
      access_token: 'fallback_access_token',
      // ... other account fields
    }
    // First call for system token returns null, second call for any spotify account returns the mock
    mockDb.account.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockAccount as any)

    const accessToken = await SpotifyTokenManager.getSystemAccessToken()

    expect(mockDb.account.findFirst).toHaveBeenCalledTimes(2)
    expect(mockDb.account.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'spotify',
        isSystemToken: true,
      },
    })
    expect(mockDb.account.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'spotify',
      },
    })
    expect(accessToken).toBe('fallback_access_token')
  })

  it('should return null if no Spotify accounts are found in the database', async () => {
    // Both calls return null
    mockDb.account.findFirst.mockResolvedValue(null)

    const accessToken = await SpotifyTokenManager.getSystemAccessToken()

    expect(mockDb.account.findFirst).toHaveBeenCalledTimes(2)
    expect(accessToken).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      '[TokenManager] No Spotify account found in the database.'
    )
  })

  it('should return null if the found account has no access token', async () => {
    const mockAccount = {
      id: '3',
      userId: 'user3',
      provider: 'spotify',
      isSystemToken: true,
      access_token: null, // No access token
      // ... other account fields
    }
    mockDb.account.findFirst.mockResolvedValue(mockAccount as any)

    const accessToken = await SpotifyTokenManager.getSystemAccessToken()

    expect(mockDb.account.findFirst).toHaveBeenCalledTimes(1)
    expect(accessToken).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      `[TokenManager] Spotify account found for user ${mockAccount.userId}, but it has no access token.`
    )
  })
})
