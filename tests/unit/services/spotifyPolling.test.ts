import { SpotifyPolling } from '@/services/spotifyPolling'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import logger from '@/utils/logger.server'

jest.mock('@/services/spotifyTokenManager')
jest.mock('@/utils/logger.server', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('SpotifyPolling', () => {
  let broadcastUpdate: jest.Mock
  let spotifyPolling: SpotifyPolling
  let mockSdk: any

  beforeEach(async () => {
    broadcastUpdate = jest.fn()
    ;(SpotifyTokenManager as jest.Mock).mockClear()

    // Mock the token manager to return a valid token so SDK initializes
    ;(SpotifyTokenManager.prototype.getValidAccessToken as jest.Mock).mockResolvedValue('mock-token')
    ;(SpotifyTokenManager.prototype.getSdkAccessToken as jest.Mock).mockReturnValue({
      access_token: 'mock-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'scope'
    })

    // Mock SpotifyApi
    mockSdk = {
      player: {
        getCurrentlyPlayingTrack: jest.fn(),
        getAvailableDevices: jest.fn(),
        startResumePlayback: jest.fn(),
        pausePlayback: jest.fn(),
        skipToNext: jest.fn(),
        skipToPrevious: jest.fn(),
        transferPlayback: jest.fn(),
        setPlaybackVolume: jest.fn(),
      }
    }
    const withAccessTokenSpy = jest.spyOn(SpotifyApi, 'withAccessToken')
    withAccessTokenSpy.mockReturnValue(mockSdk)

    spotifyPolling = await SpotifyPolling.create(broadcastUpdate)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should throw an error when getSdk is called before initialization', async () => {
    // Reset the instance to one without SDK for this test
    ;(SpotifyTokenManager.prototype.getValidAccessToken as jest.Mock).mockResolvedValue(null)
    const emptyPolling = await SpotifyPolling.create(broadcastUpdate)
    expect(() => emptyPolling._test_?.getSdk()).toThrow(
      'Spotify SDK has not been initialized.'
    )
  })

  it('should return early and not throw if getCurrentlyPlaying is called without an initialized SDK', async () => {
    // Arrange: Create instance without SDK
    ;(SpotifyTokenManager.prototype.getValidAccessToken as jest.Mock).mockResolvedValue(null)
    const emptyPolling = await SpotifyPolling.create(broadcastUpdate)

    // Act & Assert
    await expect(
      emptyPolling._test_?.getCurrentlyPlaying()
    ).resolves.not.toThrow()

    expect(broadcastUpdate).not.toHaveBeenCalled()
  })

  describe('Command Validation', () => {
    it('should log warning and abort TRANSFER_PLAYBACK if deviceId is missing', async () => {
      await spotifyPolling.handleCommand('TRANSFER_PLAYBACK', {})

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'TRANSFER_PLAYBACK' }),
        'TRANSFER_PLAYBACK missing deviceId'
      )
      expect(mockSdk.player.transferPlayback).not.toHaveBeenCalled()
    })

    it('should execute TRANSFER_PLAYBACK if deviceId is present', async () => {
      await spotifyPolling.handleCommand('TRANSFER_PLAYBACK', { deviceId: 'dev-1' })

      expect(mockSdk.player.transferPlayback).toHaveBeenCalledWith(['dev-1'], true)
    })

    it('should log warning and abort SET_VOLUME if volume is missing', async () => {
      await spotifyPolling.handleCommand('SET_VOLUME', { deviceId: 'dev-1' })

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'SET_VOLUME' }),
        'SET_VOLUME missing volume'
      )
      expect(mockSdk.player.setPlaybackVolume).not.toHaveBeenCalled()
    })

    it('should execute SET_VOLUME if volume is present', async () => {
      await spotifyPolling.handleCommand('SET_VOLUME', { deviceId: 'dev-1', volume: 50 })

      expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(50, 'dev-1')
    })
  })
})
