/**
 * @jest-environment node
 */
import {
  getPresetPlaylists,
  getUserPlaylists,
} from '../../../services/spotifyPlaylistService'
import { presetPlaylists } from '../../../services/seedData'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the SpotifyApi
jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockPlaylists = {
    items: [
      { id: '1', name: 'User Playlist 1', uri: 'uri:1' },
      { id: '2', name: 'User Playlist 2', uri: 'uri:2' },
    ],
  }
  const mockSdk = {
    currentUser: {
      playlists: {
        playlists: jest.fn().mockResolvedValue(mockPlaylists),
      },
    },
  }
  return {
    SpotifyApi: {
      withAccessToken: jest.fn(() => mockSdk),
    },
  }
})

describe('spotifyPlaylistService', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('getPresetPlaylists', () => {
    it('should return the list of preset playlists', () => {
      const playlists = getPresetPlaylists()
      expect(playlists).toEqual(presetPlaylists)
      expect(playlists.length).toBeGreaterThan(0)
    })
  })

  describe('getUserPlaylists', () => {
    const accessToken = 'test_access_token'
    let consoleWarnSpy: jest.SpyInstance
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
      // Suppress console output for error case tests
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore console output
      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should fetch and return user playlists successfully', async () => {
      const playlists = await getUserPlaylists(accessToken)

      expect(SpotifyApi.withAccessToken).toHaveBeenCalled()
      expect(playlists).toEqual([
        { id: '1', name: 'User Playlist 1', uri: 'uri:1' },
        { id: '2', name: 'User Playlist 2', uri: 'uri:2' },
      ])
    })

    it('should return an empty array if access token is missing', async () => {
      const playlists = await getUserPlaylists('')
      expect(playlists).toEqual([])
      expect(SpotifyApi.withAccessToken).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot get user playlists: Access token is missing.'
      )
    })

    it('should return an empty array on API failure', async () => {
      // Configure the mock to simulate an error
      const mockSdk = SpotifyApi.withAccessToken(
        'client_id',
        {} as any
      ) as any
      const apiError = new Error('API Error')
      mockSdk.currentUser.playlists.playlists.mockRejectedValueOnce(apiError)

      const playlists = await getUserPlaylists(accessToken)

      expect(playlists).toEqual([])
      expect(SpotifyApi.withAccessToken).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching user playlists:',
        apiError
      )
    })
  })
})
