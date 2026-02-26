// tests/unit/app/api/spotify/playlists/[playlistId]/tracks/route.test.ts
/** @jest-environment node */
import { GET } from '@/app/api/spotify/playlists/[playlistId]/tracks/route'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { RouteContext } from '@/lib/types'

jest.mock('@/lib/spotify/sdk')
jest.mock('@/lib/middleware/errorHandler', () => ({
  withErrorHandler: (handler: unknown) => handler,
}))

describe('API Route: /api/spotify/playlists/[playlistId]/tracks', () => {
  const mockPlaylistId = 'playlist-123'
  const mockTrack = {
    id: 't1',
    name: 'Track 1',
    uri: 'spotify:track:t1',
    duration_ms: 180000,
    type: 'track',
    artists: [{ name: 'Artist 1' }],
    album: { name: 'Album 1', images: [{ url: 'art1.jpg' }] },
  }

  const mockSpotifyResponse = {
    items: [
      { track: mockTrack },
      { track: null }, // Should be filtered out
      { track: { ...mockTrack, type: 'episode' } }, // Should be filtered out
    ],
    total: 3,
    limit: 20,
    offset: 0,
    next: null,
    previous: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return mapped and filtered tracks', async () => {
    const mockGetPlaylistItems = jest
      .fn()
      .mockResolvedValue(mockSpotifyResponse)
    ;(getAuthenticatedSpotifyApi as jest.Mock).mockResolvedValue({
      playlists: { getPlaylistItems: mockGetPlaylistItems },
    })

    const req = new Request(
      `http://localhost/api/spotify/playlists/${mockPlaylistId}/tracks`
    )
    const context = {
      params: Promise.resolve({ playlistId: mockPlaylistId }),
    } as RouteContext<{ playlistId: string }>

    const response = await GET(req, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tracks).toHaveLength(1)
    expect(data.tracks[0]).toEqual({
      id: 't1',
      name: 'Track 1',
      uri: 'spotify:track:t1',
      duration_ms: 180000,
      artists: [{ name: 'Artist 1' }],
      album: { name: 'Album 1', images: [{ url: 'art1.jpg' }] },
    })
    expect(data.total).toBe(3)
    expect(mockGetPlaylistItems).toHaveBeenCalledWith(
      mockPlaylistId,
      undefined,
      undefined,
      20,
      0
    )
  })

  it('should use limit and offset from search params', async () => {
    const mockGetPlaylistItems = jest
      .fn()
      .mockResolvedValue(mockSpotifyResponse)
    ;(getAuthenticatedSpotifyApi as jest.Mock).mockResolvedValue({
      playlists: { getPlaylistItems: mockGetPlaylistItems },
    })

    const req = new Request(
      `http://localhost/api/spotify/playlists/${mockPlaylistId}/tracks?limit=10&offset=5`
    )
    const context = {
      params: Promise.resolve({ playlistId: mockPlaylistId }),
    } as RouteContext<{ playlistId: string }>

    await GET(req, context)

    expect(mockGetPlaylistItems).toHaveBeenCalledWith(
      mockPlaylistId,
      undefined,
      undefined,
      10,
      5
    )
  })

  it('should throw error if playlistId is missing', async () => {
    const req = new Request(`http://localhost/api/spotify/playlists//tracks`)
    const context = {
      params: Promise.resolve({ playlistId: '' }),
    } as RouteContext<{ playlistId: string }>

    await expect(GET(req, context)).rejects.toThrow('Playlist ID is required.')
  })
})
