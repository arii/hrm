import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPlayerManager } from '../../../services/spotifyPlayerManager'
import { mockPlayer } from '../spotify-test-utils'
import { SafeSpotifyApi } from '../../../services/safeSpotifyApi'
import { createSafeSpotifyApi } from '../../../services/safeSpotifyApi'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the logger to prevent logs from appearing in test output
jest.mock('../../../utils/logger.server.js', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}))

describe('SpotifyPlayerManager', () => {
  let playerManager: SpotifyPlayerManager
  let sdk: SafeSpotifyApi
  let broadcastMock: jest.Mock
  let getStateMock: jest.Mock
  let setStateMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // We create a mock SDK using the mocked player
    sdk = createSafeSpotifyApi({ player: mockPlayer } as unknown as SpotifyApi)
    broadcastMock = jest.fn()
    getStateMock = jest.fn().mockReturnValue({
      volume: 50,
      isMuted: false,
    })
    setStateMock = jest.fn()

    playerManager = new SpotifyPlayerManager(
      sdk,
      broadcastMock,
      getStateMock,
      setStateMock
    )
  })

  describe('executeSpotifyCommand', () => {
    it('should handle PLAY command', async () => {
      await playerManager.executeSpotifyCommand('PLAY', { deviceId: 'test_device' })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('test_device')
    })

    it('should handle PAUSE command', async () => {
      await playerManager.executeSpotifyCommand('PAUSE', { deviceId: 'test_device' })
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device')
    })

    it('should handle NEXT command', async () => {
      await playerManager.executeSpotifyCommand('NEXT', { deviceId: 'test_device' })
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device')
    })

    it('should handle PREVIOUS command', async () => {
      await playerManager.executeSpotifyCommand('PREVIOUS', { deviceId: 'test_device' })
      expect(mockPlayer.skipToPrevious).toHaveBeenCalledWith('test_device')
    })

    it('should handle TRANSFER_PLAYBACK command', async () => {
      await playerManager.executeSpotifyCommand('TRANSFER_PLAYBACK', {
        deviceId: 'test_device',
      })
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith(
        ['test_device'],
        true
      )
    })

    describe('SET_VOLUME', () => {
      it('should set volume and update state', async () => {
        await playerManager.executeSpotifyCommand('SET_VOLUME', { volume: 75 })
        expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, undefined)
        expect(setStateMock).toHaveBeenCalledWith({
          volume: 75,
          isMuted: false,
        })
        expect(broadcastMock).toHaveBeenCalledWith({
          type: 'SPOTIFY_UPDATE',
          payload: expect.any(Object),
        })
      })

      it('should clamp volume to 100', async () => {
        await playerManager.executeSpotifyCommand('SET_VOLUME', { volume: 150 })
        expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, undefined)
        expect(setStateMock).toHaveBeenCalledWith({
          volume: 100,
          isMuted: false,
        })
      })

      it('should clamp volume to 0', async () => {
        await playerManager.executeSpotifyCommand('SET_VOLUME', { volume: -10 })
        expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, undefined)
        expect(setStateMock).toHaveBeenCalledWith({
          volume: 0,
          isMuted: true,
        })
      })
    })

    it('should handle PLAY command with context URI', async () => {
      const contextUri = 'spotify:album:123'
      await playerManager.executeSpotifyCommand('PLAY', { contextUri })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        undefined,
        contextUri
      )
    })

    it('should handle PLAY command with a specific track URI', async () => {
      const uri = 'spotify:track:456'
      await playerManager.executeSpotifyCommand('PLAY', { uri })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        undefined,
        undefined,
        [uri]
      )
    })
  })

  describe('executeSdkCommand error handling', () => {
    it('should suppress SyntaxError for empty responses', async () => {
      const syntaxError = new SyntaxError('Unexpected end of JSON input')
      mockPlayer.pausePlayback.mockRejectedValue(syntaxError)

      await expect(
        playerManager.executeSpotifyCommand('PAUSE', { deviceId: 'test' })
      ).resolves.not.toThrow()
    })

    it('should re-throw non-SyntaxError errors', async () => {
      const genericError = new Error('API is down')
      mockPlayer.pausePlayback.mockRejectedValue(genericError)

      await expect(
        playerManager.executeSpotifyCommand('PAUSE', { deviceId: 'test' })
      ).rejects.toThrow('API is down')
    })
  })
})
