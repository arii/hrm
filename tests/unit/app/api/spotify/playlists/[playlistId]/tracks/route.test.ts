// File: tests/unit/app/api/spotify/playlists/[playlistId]/tracks/route.test.ts
import { GET } from '@/app/api/spotify/playlists/[playlistId]/tracks/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

jest.mock('next-auth/next')
jest.mock('@spotify/web-api-ts-sdk')

describe('GET /api/spotify/playlists/[playlistId]/tracks', () => {
  it('should return a paginated list of tracks for a valid playlist ID', async () => {
    // Arrange
    const mockSession = { accessToken: 'test-token' }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const mockTracks = {
      items: [
        {
          track: {
            id: 't1',
            name: 'Track 1',
            artists: [{ name: 'Artist 1' }],
            album: { images: [{ url: 'http://example.com/art1.jpg' }] },
            duration_ms: 180000,
            uri: 'spotify:track:t1',
            type: 'track',
          },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      next: null,
      previous: null,
    }
    const mockGetPlaylistItems = jest.fn().mockResolvedValue(mockTracks)
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: { getPlaylistItems: mockGetPlaylistItems },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123/tracks')
    const params = { params: { playlistId: '123' } }

    // Act
    const response = await GET(req, params)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.tracks).toHaveLength(1)
    expect(data.tracks[0]).toEqual({
      id: 't1',
      name: 'Track 1',
      artists: 'Artist 1',
      albumArt: 'http://example.com/art1.jpg',
      duration: 180000,
      uri: 'spotify:track:t1',
    })
  })
})
