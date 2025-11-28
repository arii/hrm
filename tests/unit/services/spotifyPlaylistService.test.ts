// File: tests/unit/services/spotifyPlaylistService.test.ts
import {
  getPresetPlaylists,
  getUserPlaylists,
} from '../../../services/spotifyPlaylistService'
import { presetPlaylists } from '../../../services/seedData'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the Spotify SDK
jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockPlaylists = {
    items: [
      { id: '1', name: 'User Playlist 1', uri: 'spotify:playlist:1' },
      { id: '2', name: 'User Playlist 2', uri: 'spotify:playlist:2' },
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

describe('Spotify Playlist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('getPresetPlaylists', () => {
    it('should return the correct preset playlists', () => {
      const playlists = getPresetPlaylists()
      expect(playlists).toEqual(presetPlaylists)
      expect(playlists.length).toBeGreaterThan(0)
    })

    it('should have valid playlist structure', () => {
      const playlists = getPresetPlaylists()
      playlists.forEach((playlist) => {
        expect(playlist).toHaveProperty('id')
        expect(playlist).toHaveProperty('name')
        expect(playlist).toHaveProperty('uri')
        expect(playlist.uri).toMatch(/^spotify:playlist:/)
      })
    })
  })

  describe('getUserPlaylists', () => {
    it('should fetch and return user playlists correctly', async () => {
      const playlists = await getUserPlaylists('valid-token')
      expect(SpotifyApi.withAccessToken).toHaveBeenCalled()
      expect(playlists).toEqual([
        { id: '1', name: 'User Playlist 1', uri: 'spotify:playlist:1' },
        { id: '2', name: 'User Playlist 2', uri: 'spotify:playlist:2' },
      ])
    })

    it('should return an empty array if no access token is provided', async () => {
      const playlists = await getUserPlaylists('')
      expect(playlists).toEqual([])
      expect(SpotifyApi.withAccessToken).not.toHaveBeenCalled()
    })

    it('should return an empty array and log an error if the API call fails', async () => {
      // Configure the mock to throw an error for this specific test
      const mockSdkWithError = {
        currentUser: {
          playlists: {
            playlists: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      }
      ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdkWithError)

      const playlists = await getUserPlaylists('valid-token')
      expect(playlists).toEqual([])
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user playlists:',
        expect.any(Error)
      )
    })
  })
})
