import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPlayerManager } from '../../../services/spotifyPlayerManager'
import { mockPlayer } from '../spotify-test-utils'
import { SafeSpotifyApi } from '../../../services/safeSpotifyApi'
import { createSafeSpotifyApi } from '../../../services/safeSpotifyApi'
import { SpotifyApi, PlaybackState } from '@spotify/web-api-ts-sdk'

// Mock the logger to prevent logs from appearing in test output
jest.mock('../../../utils/logger.server.js', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: require('../spotify-mocks').mockLogger,
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
      await playerManager.executeSpotifyCommand('PLAY', {
        deviceId: 'test_device',
      })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('test_device')
    })

    it('should handle PAUSE command', async () => {
      await playerManager.executeSpotifyCommand('PAUSE', {
        deviceId: 'test_device',
      })
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device')
    })

    it('should handle NEXT command', async () => {
      await playerManager.executeSpotifyCommand('NEXT', {
        deviceId: 'test_device',
      })
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device')
    })

    it('should handle PREVIOUS command', async () => {
      await playerManager.executeSpotifyCommand('PREVIOUS', {
        deviceId: 'test_device',
      })
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
        expect(setStateMock).toHaveBeenCalledWith(expect.any(Function))
        const updateFn = setStateMock.mock.calls[0][0]
        const newState = updateFn({ volume: 50, isMuted: false })
        expect(newState).toEqual({
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
        expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
          100,
          undefined
        )
        expect(setStateMock).toHaveBeenCalledWith(expect.any(Function))
        const updateFn = setStateMock.mock.calls[0][0]
        const newState = updateFn({ volume: 50, isMuted: false })
        expect(newState).toEqual({
          volume: 100,
          isMuted: false,
        })
      })

      it('should clamp volume to 0', async () => {
        await playerManager.executeSpotifyCommand('SET_VOLUME', { volume: -10 })
        expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, undefined)
        expect(setStateMock).toHaveBeenCalledWith(expect.any(Function))
        const updateFn = setStateMock.mock.calls[0][0]
        const newState = updateFn({ volume: 50, isMuted: false })
        expect(newState).toEqual({
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

  describe('fetchPlaybackState', () => {
    it('should return null when no playback state returned', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)
      const result = await playerManager.fetchPlaybackState()
      expect(result).toBeNull()
    })

    it('should return null when no item in playback state', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue({
        item: null,
      } as unknown as PlaybackState)
      const result = await playerManager.fetchPlaybackState()
      expect(result).toBeNull()
    })

    it('should return parsed track data', async () => {
      const mockTrack = {
        id: 'track1',
        name: 'Track Name',
        type: 'track',
        artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
        album: {
          name: 'Album Name',
          images: [{ url: 'http://image.url' }],
        },
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue({
        item: mockTrack,
        is_playing: true,
      } as unknown as PlaybackState)

      const result = await playerManager.fetchPlaybackState()

      expect(result).toEqual({
        trackId: 'track1',
        trackName: 'Track Name',
        artist: 'Artist 1, Artist 2',
        albumName: 'Album Name',
        albumArtUrl: 'http://image.url',
        isPlaying: true,
      })
    })

    it('should return parsed episode data', async () => {
      const mockEpisode = {
        id: 'episode1',
        name: 'Episode Name',
        type: 'episode',
        show: {
          publisher: 'Publisher Name',
          name: 'Show Name',
          images: [{ url: 'http://episode.image.url' }],
        },
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue({
        item: mockEpisode,
        is_playing: false,
      } as unknown as PlaybackState)

      const result = await playerManager.fetchPlaybackState()

      expect(result).toEqual({
        trackId: 'episode1',
        trackName: 'Episode Name',
        artist: 'Publisher Name',
        albumName: 'Show Name',
        albumArtUrl: 'http://episode.image.url',
        isPlaying: false,
      })
    })
  })
})
