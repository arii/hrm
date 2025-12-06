import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import logger from '../../utils/logger'
import { jest } from '@jest/globals'
import * as Prisma from '@prisma/client'

// Mock the SpotifyTokenManager module
jest.mock('../../services/spotifyTokenManager')

const prismaMock =
  new (Prisma as jest.Mocked<typeof Prisma>).PrismaClient() as jest.Mocked<Prisma.PrismaClient>

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastUpdate: jest.Mock
  let mockPlayer: any
  let refreshSpy: jest.SpyInstance

  beforeEach(async () => {
    jest.clearAllMocks()
    broadcastUpdate = jest.fn()

    // Mock the Spotify SDK player
    mockPlayer = {
      getCurrentlyPlayingTrack: jest.fn(),
      getAvailableDevices: jest.fn(),
      startResumePlayback: jest.fn(),
      pausePlayback: jest.fn(),
      skipToNext: jest.fn(),
      skipToPrevious: jest.fn(),
      transferPlayback: jest.fn(),
      setPlaybackVolume: jest.fn(),
    }

    // Mock the SpotifyTokenManager to return a valid token
    ;(SpotifyTokenManager as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest.fn().mockResolvedValue('mock_access_token'),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
      }),
      loadToken: jest.fn().mockResolvedValue(undefined),
    }))

    // Spy on the refresh method to check if it's called
    refreshSpy = jest.spyOn(
      SpotifyPolling.prototype as any,
      'checkAndRefreshSdkToken'
    )

    spotifyService = await SpotifyPolling.create(broadcastUpdate, 'test-user-id')

    // Mock the SDK after it's created
    ;(spotifyService as any).sdk = {
      player: mockPlayer,
    }
  })

  afterEach(() => {
    spotifyService.cleanup()
    refreshSpy.mockRestore()
  })

  it('should be created', () => {
    expect(spotifyService).toBeDefined()
  })

  // ... (rest of the tests)
})
