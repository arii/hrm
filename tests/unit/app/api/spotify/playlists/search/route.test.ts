// tests/unit/app/api/spotify/playlists/search/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/playlists/search/route'
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockPlaylists = {
    items: [
      {
        id: 's1',
        name: 'Search Hit',
        uri: 'spotify:playlist:s1',
        description: 'Found it',
        images: [{ url: 'http://example.com/s.jpg' }],
        tracks: { total: 7 },
        owner: { display_name: 'Curator' },
        public: true,
      },
    ],
  }
  const mockSearch = jest.fn().mockResolvedValue({ playlists: mockPlaylists })
  return {
    SpotifyApi: {
      withAccessToken: jest.fn(() => ({ search: mockSearch })),
    },
  }
})

const mockedGetServerSession = getServerSession as jest.Mock

describe('API Route: /api/spotify/playlists/search', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)

    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/search?q=rock'
    )
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
  })

  it('should return empty items for a blank query', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })

    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/search?q=%20'
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toEqual([])
  })

  it('should reject overlong queries', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })

    const req = new NextRequest(
      `http://localhost/api/spotify/playlists/search?q=${'x'.repeat(101)}`
    )
    const response = await GET(req)

    expect(response.status).toBe(400)
  })

  it('should map search hits with isSearchResult on success', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })

    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/search?q=rock'
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toHaveLength(1)
    expect(data.items[0]).toMatchObject({
      id: 's1',
      name: 'Search Hit',
      imageUrl: 'http://example.com/s.jpg',
      trackCount: 7,
      owner: 'Curator',
      isSearchResult: true,
    })
  })

  it('should return 500 when the Spotify search fails', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      search: jest.fn().mockRejectedValue(new Error('Spotify API failed')),
    })

    const req = new NextRequest(
      'http://localhost/api/spotify/playlists/search?q=rock'
    )
    const response = await GET(req)

    expect(response.status).toBe(500)
  })
})
