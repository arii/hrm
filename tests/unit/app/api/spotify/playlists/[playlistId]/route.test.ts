// File: tests/unit/app/api/spotify/playlists/[playlistId]/route.test.ts
import { GET as getPlaylist } from '@/app/api/spotify/playlists/[playlistId]/route'
import { GET as getTracks } from '@/app/api/spotify/playlists/[playlistId]/tracks/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { RouteContext } from '@/lib/types'

jest.mock('next-auth/next')
jest.mock('@spotify/web-api-ts-sdk')

const mockSession = { accessToken: 'test-token' }
const mockTrack = {
  id: 't1',
  name: 'Track 1',
  uri: 'spotify:track:t1',
  duration_ms: 180000,
  type: 'track',
  artists: [{ name: 'Artist 1' }],
  album: { name: 'Album 1', images: [{ url: 'art1.jpg' }] },
}
const mappedTrack = {
  id: 't1',
  name: 'Track 1',
  uri: 'spotify:track:t1',
  duration_ms: 180000,
  artists: [{ name: 'Artist 1' }],
  album: { name: 'Album 1', images: [{ url: 'art1.jpg' }] },
}

describe('Playlist API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  it('GET /api/spotify/playlists/[playlistId]', async () => {
    const mockGetPlaylist = jest.fn().mockResolvedValue({
      id: '123',
      name: 'Test',
      description: 'Desc',
      images: [{ url: 'img.jpg' }],
      owner: { display_name: 'User' },
      tracks: { total: 10, items: [{ track: mockTrack }] },
    })
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: { getPlaylist: mockGetPlaylist },
    })

    const context = {
      params: Promise.resolve({ playlistId: '123' }),
    } as RouteContext<{ playlistId: string }>
    const res = await getPlaylist(new Request('http://l/123'), context)
    expect(await res.json()).toEqual(
      expect.objectContaining({ id: '123', tracks: [mappedTrack] })
    )
  })

  it('GET /api/spotify/playlists/[playlistId]/tracks', async () => {
    const mockGetTracks = jest.fn().mockResolvedValue({
      items: [{ track: mockTrack }],
      total: 1,
      limit: 20,
      offset: 0,
      next: null,
      previous: null,
    })
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: { getPlaylistItems: mockGetTracks },
    })

    const context = {
      params: Promise.resolve({ playlistId: '123' }),
    } as RouteContext<{ playlistId: string }>
    const res = await getTracks(new Request('http://l/123/tracks'), context)
    const data = await res.json()
    expect(data.tracks[0]).toEqual(mappedTrack)
  })
})
