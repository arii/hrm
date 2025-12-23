/**
 * @jest-environment node
 */

import { GET } from '@/app/api/spotify/playlists/[playlistId]/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { NextRequest } from 'next/server'
import { ApiError } from '@/lib/errors'

// Mock next-auth
jest.mock('next-auth/next')
const mockGetServerSession = getServerSession as jest.Mock

// Mock Spotify SDK
jest.mock('@spotify/web-api-ts-sdk')
const mockGetPlaylistItems = jest.fn()

SpotifyApi.withAccessToken = jest.fn().mockReturnValue({
  playlists: {
    getPlaylistItems: mockGetPlaylistItems,
  },
})

describe('API Route: /api/spotify/playlists/[playlistId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/12345'
    )
    const context = { params: { playlistId: '12345' } }

    const response = await GET(req, context)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Not authenticated or token is missing.')
  })

  it('should return 400 if playlistId is missing', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    const req = new NextRequest('http://localhost/api/spotify/playlists/')
    // @ts-ignore
    const context = { params: {} } // Missing playlistId

    const response = await GET(req, context)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Playlist ID is required.')
  })

  it('should fetch and return playlist tracks successfully', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    const mockTracks = {
      items: [
        {
          track: {
            name: 'Test Track',
            uri: 'spotify:track:123',
            duration_ms: 200000,
            explicit: false,
            popularity: 90,
            artists: [{ name: 'Artist1' }],
            album: { name: 'Test Album', images: [{ url: 'http://image.url' }] },
          },
        },
      ],
      total: 1,
    }
    mockGetPlaylistItems.mockResolvedValue(mockTracks)

    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/12345?limit=10&offset=0'
    )
    const context = { params: { playlistId: '12345' } }

    const response = await GET(req, context)
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(mockGetPlaylistItems).toHaveBeenCalledWith(
      '12345',
      undefined,
      'items(track(name,artists,album(name,images),duration_ms,uri,explicit,popularity))',
      10,
      0
    )
    expect(body.tracks).toHaveLength(1)
    expect(body.tracks[0].name).toBe('Test Track')
    expect(body.tracks[0].albumName).toBe('Test Album')
    expect(body.total).toBe(1)
  })

  it('should handle Spotify API errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    mockGetPlaylistItems.mockRejectedValue(new Error('Spotify API Error'))

    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/12345'
    )
    const context = { params: { playlistId: '12345' } }

    const response = await GET(req, context)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal Server Error')
  })
})
