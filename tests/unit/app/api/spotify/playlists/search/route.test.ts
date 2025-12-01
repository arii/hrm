// tests/unit/app/api/spotify/playlists/search/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/playlists/search/route'
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

// Mock 'next-auth' and 'next-auth/next'
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock Spotify SDK
jest.mock('@spotify/web-api-ts-sdk')

const mockedGetServerSession = getServerSession as jest.Mock
const mockedSpotifyApi = SpotifyApi as jest.Mocked<typeof SpotifyApi>

describe('API Route: /api/spotify/playlists/search', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock a successful session by default
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
    })

    // Mock a successful, empty search result by default
    const mockSpotifyInstance = {
      search: jest.fn().mockResolvedValue({ playlists: { items: [] } }),
    }
    mockedSpotifyApi.withAccessToken.mockReturnValue(
      mockSpotifyInstance as unknown as SpotifyApi
    )
  })

  it('should return 400 Bad Request if "query" parameter is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/spotify/playlists/search?type=playlist'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid query parameters')
    expect(data.details[0].message).toBe('Invalid input: expected string, received undefined')
  })

  it('should return 400 Bad Request if "type" parameter is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/spotify/playlists/search?query=test'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid query parameters')
    expect(data.details[0].message).toBe('Invalid input: expected string, received undefined')
  })

  it('should return 400 Bad Request for unexpected query parameters', async () => {
    const request = new NextRequest(
      'http://localhost/api/spotify/playlists/search?query=test&type=playlist&extra=param'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid query parameters')
    expect(data.details[0].message).toBe("Unrecognized key: \"extra\"")
  })

  it('should return 400 Bad Request if query is too long', async () => {
    const longQuery = 'a'.repeat(101)
    const request = new NextRequest(
      `http://localhost/api/spotify/playlists/search?query=${longQuery}&type=playlist`
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid query parameters')
    expect(data.details[0].message).toBe(
      'Search query cannot exceed 100 characters'
    )
  })

  it('should call the Spotify API with correct parameters on valid request', async () => {
    const request = new NextRequest(
      'http://localhost/api/spotify/playlists/search?query=Top%20Hits&type=playlist,album'
    )
    await GET(request)

    expect(getServerSession).toHaveBeenCalledWith(authOptions)
    expect(mockedSpotifyApi.withAccessToken).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        access_token: 'fake-access-token',
      })
    )
    const mockSpotifyInstance = mockedSpotifyApi.withAccessToken.mock.results[0].value
    expect(mockSpotifyInstance.search).toHaveBeenCalledWith(
      'Top Hits',
      ['playlist', 'album'],
      undefined,
      20
    )
  })

  it('should return 200 OK with search results for a valid request', async () => {
    const mockSearchResults = {
      playlists: {
        items: [
          {
            id: '123',
            name: 'Top Hits Playlist',
            uri: 'spotify:playlist:123',
            description: 'The best hits!',
            images: [{ url: 'http://image.url/top.jpg' }],
            tracks: { total: 50 },
            owner: { display_name: 'Spotify' },
            public: true,
          },
        ],
      },
    }
    const mockSpotifyInstance = {
      search: jest.fn().mockResolvedValue(mockSearchResults),
    }
    mockedSpotifyApi.withAccessToken.mockReturnValue(
      mockSpotifyInstance as unknown as SpotifyApi
    )

    const request = new NextRequest(
      'http://localhost/api/spotify/playlists/search?query=Top%20Hits&type=playlist'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toBeDefined()
    expect(data.items.length).toBe(1)
    expect(data.items[0].name).toBe('Top Hits Playlist')
    expect(data.items[0].isSearchResult).toBe(true)
  })
})
