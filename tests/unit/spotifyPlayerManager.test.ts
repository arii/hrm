import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { SpotifyPlayerManager } from '../../services/spotifyPlayerManager'
import { SafeSpotifyApi } from '../../services/safeSpotifyApi'
import { ServerMessage, SpotifyData } from '../../types/websocket'
import { mockPlayer } from './spotify-test-utils'

const NOT_PLAYING_MESSAGE = 'Nothing is currently playing.'

describe('SpotifyPlayerManager', () => {
  let playerManager: SpotifyPlayerManager
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let getStateMock: jest.Mock<() => SpotifyData>
  let setStateMock: jest.Mock<
    (update: SpotifyData | ((prevState: SpotifyData) => SpotifyData)) => void
  >
  let currentState: SpotifyData

  beforeEach(() => {
    jest.clearAllMocks()

    // Default state for testing
    currentState = {
      trackId: null,
      trackName: NOT_PLAYING_MESSAGE,
      artist: '',
      albumName: '',
      albumArtUrl: '',
      isPlaying: false,
      devices: [],
      volume: 70,
      isMuted: false,
    }

    broadcastMock = jest.fn()
    getStateMock = jest.fn(() => currentState)
    setStateMock = jest.fn((update) => {
      if (typeof update === 'function') {
        currentState = update(currentState)
      } else {
        currentState = update
      }
    })

    // Create a mock SDK using the mockPlayer from utilities
    const mockSdk = {
      player: mockPlayer,
    } as unknown as SafeSpotifyApi

    playerManager = new SpotifyPlayerManager(
      mockSdk,
      broadcastMock,
      getStateMock,
      setStateMock
    )
  })

  describe('refreshPlaybackState', () => {
    it('should update state and broadcast when track changes', async () => {
      // Arrange: SDK returns a new track
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue({
        item: {
          id: 'track1',
          name: 'New Song',
          type: 'track',
          artists: [{ name: 'Artist 1' }],
          album: { name: 'Album 1', images: [{ url: 'url1' }] },
        },
        is_playing: true,
      })

      // Act
      await playerManager.refreshPlaybackState()

      // Assert
      // Verify state was updated
      expect(setStateMock).toHaveBeenCalled()
      // Verify broadcast was sent with correct details
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          trackId: 'track1',
          trackName: 'New Song',
          artist: 'Artist 1',
          albumName: 'Album 1',
          albumArtUrl: 'url1',
          isPlaying: true,
        }),
      })
    })

    it('should update state and broadcast when playback stops', async () => {
      // Arrange: Current state shows playing, SDK returns null
      currentState = {
        ...currentState,
        trackId: 'track1',
        trackName: 'Some Song',
        isPlaying: true,
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)

      // Act
      await playerManager.refreshPlaybackState()

      // Assert
      expect(setStateMock).toHaveBeenCalled()
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          trackId: null,
          trackName: NOT_PLAYING_MESSAGE,
          isPlaying: false,
        }),
      })
    })

    it('should NOT update or broadcast if state is unchanged (playing same song)', async () => {
      // Arrange: Current state matches SDK response
      currentState = {
        ...currentState,
        trackId: 'track1',
        trackName: 'Song 1',
        artist: 'Artist 1',
        albumName: 'Album 1',
        albumArtUrl: 'url1',
        isPlaying: true,
      }

      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue({
        item: {
          id: 'track1',
          name: 'Song 1',
          type: 'track',
          artists: [{ name: 'Artist 1' }],
          album: { name: 'Album 1', images: [{ url: 'url1' }] },
        },
        is_playing: true,
      })

      // Act
      await playerManager.refreshPlaybackState()

      // Assert
      expect(setStateMock).not.toHaveBeenCalled()
      expect(broadcastMock).not.toHaveBeenCalled()
    })

    it('should NOT update or broadcast if state is unchanged (stopped)', async () => {
      // Arrange: Current state is stopped, SDK returns null
      currentState = {
        ...currentState,
        trackId: null,
        trackName: NOT_PLAYING_MESSAGE,
        isPlaying: false,
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)

      // Act
      await playerManager.refreshPlaybackState()

      // Assert
      expect(setStateMock).not.toHaveBeenCalled()
      expect(broadcastMock).not.toHaveBeenCalled()
    })

    it('should handle podcast episodes correctly', async () => {
      // Arrange: SDK returns an episode
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue({
        item: {
          id: 'episode1',
          name: 'Podcast Episode',
          type: 'episode',
          show: {
            publisher: 'Podcast Host',
            name: 'Podcast Show',
            images: [{ url: 'podcast_url' }],
          },
        },
        is_playing: true,
      })

      // Act
      await playerManager.refreshPlaybackState()

      // Assert
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          trackId: 'episode1',
          trackName: 'Podcast Episode',
          artist: 'Podcast Host',
          albumName: 'Podcast Show',
          albumArtUrl: 'podcast_url',
          isPlaying: true,
        }),
      })
    })
  })
})
