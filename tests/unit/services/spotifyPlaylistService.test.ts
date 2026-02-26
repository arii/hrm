// File: tests/unit/services/spotifyPlaylistService.test.ts
import { jest } from '@jest/globals'
import { getUserPlaylists } from '../../../services/spotifyPlaylistService'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

jest.mock('@spotify/web-api-ts-sdk')

describe('getUserPlaylists', () => {
  it('should fetch and return user playlists', async () => {
    const mockItems = [
      {
        id: '1',
        name: 'P1',
        uri: 'u1',
        tracks: { total: 10 },
        owner: { display_name: 'O1' },
      },
    ]
    const mockSdk = {
      currentUser: {
        playlists: {
          playlists: jest.fn().mockResolvedValue({ items: mockItems }),
        },
      },
    }
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

    const res = await getUserPlaylists('token')
    expect(res[0]).toEqual(expect.objectContaining({ id: '1', name: 'P1' }))
  })

  it('should return empty array on failure', async () => {
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      currentUser: {
        playlists: { playlists: jest.fn().mockRejectedValue('Err') },
      },
    })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(await getUserPlaylists('token')).toEqual([])
  })
})
