// File: tests/unit/services/spotifyPlaylistService.test.ts
import { jest } from '@jest/globals'
import {
  getPresetPlaylists,
  getUserPlaylists,
} from '../../../services/spotifyPlaylistService'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { presetPlaylists } from '../../../services/seedData'

jest.mock('@spotify/web-api-ts-sdk')

describe('Spotify Playlist Service', () => {
  describe('getPresetPlaylists', () => {
    it('should return the list of preset playlists', () => {
      const playlists = getPresetPlaylists()
      expect(playlists).toEqual(presetPlaylists)
    })
  })

  describe('getUserPlaylists', () => {
    it('should fetch and return user playlists', async () => {
      const mockPlaylists = {
        items: [
          { id: '1', name: 'Playlist 1', uri: 'uri:1' },
          { id: '2', name: 'Playlist 2', uri: 'uri:2' },
        ],
      }
      const mockSdk = {
        currentUser: {
          playlists: {
            playlists: jest.fn().mockResolvedValue(mockPlaylists),
          },
        },
      }
      ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

      const playlists = await getUserPlaylists('test_token')
      expect(playlists).toEqual([
        { id: '1', name: 'Playlist 1', uri: 'uri:1' },
        { id: '2', name: 'Playlist 2', uri: 'uri:2' },
      ])
    })

    it('should return an empty array if the access token is missing', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const playlists = await getUserPlaylists('')
      expect(playlists).toEqual([])
      consoleWarnSpy.mockRestore()
    })

    it('should return an empty array if the API call fails', async () => {
      const mockSdk = {
        currentUser: {
          playlists: {
            playlists: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      }
      ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

      // Suppress console.error for this test
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const playlists = await getUserPlaylists('test_token')
      expect(playlists).toEqual([])

      // Restore console.error
      consoleErrorSpy.mockRestore()
    })
  })
})
