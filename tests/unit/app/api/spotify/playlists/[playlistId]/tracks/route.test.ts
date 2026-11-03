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
            album: {
              name: 'Album 1',
              images: [{ url: 'http://example.com/art1.jpg' }],
            },
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
      album: 'Album 1',
      albumArt: 'http://example.com/art1.jpg',
      duration: 180000,
      uri: 'spotify:track:t1',
    })
  })

  it('nulls album fields for tracks without album metadata', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    })
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: {
        getPlaylistItems: jest.fn().mockResolvedValue({
          items: [
            {
              track: {
                id: 'local1',
                name: 'Local Track',
                artists: [{ name: 'Local Artist' }],
                album: null,
                duration_ms: 120000,
                uri: 'spotify:local:1',
                type: 'track',
              },
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
          next: null,
          previous: null,
        }),
      },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123/tracks')
    const params = { params: { playlistId: '123' } }

    const response = await GET(req, params)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tracks[0]).toMatchObject({ album: null, albumArt: null })
  })
})
