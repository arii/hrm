// File: tests/unit/app/api/spotify/playlists/[playlistId]/route.test.ts
import { GET } from '@/app/api/spotify/playlists/[playlistId]/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

jest.mock('next-auth/next')
jest.mock('@spotify/web-api-ts-sdk')

describe('GET /api/spotify/playlists/[playlistId]', () => {
  it('should return playlist details and tracks for a valid playlist ID', async () => {
    // Arrange
    const mockSession = { accessToken: 'test-token' }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const mockPlaylist = {
      id: '123',
      name: 'Test Playlist',
      description: 'A test playlist',
      images: [{ url: 'http://example.com/image.jpg' }],
      owner: { display_name: 'Test User' },
      tracks: {
        items: [
          {
            track: {
              type: 'track',
              uri: 'spotify:track:1',
              name: 'Track 1',
              artists: [{ name: 'Artist 1' }],
              duration_ms: 180000,
            },
          },
          {
            track: {
              type: 'track',
              uri: 'spotify:track:2',
              name: 'Track 2',
              artists: [{ name: 'Artist 2' }],
              duration_ms: 240000,
            },
          },
        ],
      },
    }
    const mockGetPlaylist = jest.fn().mockResolvedValue(mockPlaylist)
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: { getPlaylist: mockGetPlaylist },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123')
    const params = { params: { playlistId: '123' } }

    // Act
    const response = await GET(req, params)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      name: 'Test Playlist',
      description: 'A test playlist',
      imageUrl: 'http://example.com/image.jpg',
      tracks: [
        {
          uri: 'spotify:track:1',
          name: 'Track 1',
          artist: 'Artist 1',
          duration: 180000,
        },
        {
          uri: 'spotify:track:2',
          name: 'Track 2',
          artist: 'Artist 2',
          duration: 240000,
        },
      ],
    })
  })
})
