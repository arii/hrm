// tests/unit/app/api/spotify/playlists/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/playlists/route'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { headers, cookies } from 'next/headers'

// Mock the auth function from our library
const mockAuth = jest.fn()
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => mockAuth()),
}))

// Mock 'next/headers'
jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}))

// Mock Spotify SDK
jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockPlaylists = {
    items: [
      {
        id: '1',
        name: 'User Playlist 1',
        uri: 'spotify:playlist:1',
        description: 'Test Description',
        images: [{ url: 'http://example.com/image.jpg' }],
        tracks: { total: 10 },
        owner: { display_name: 'Test User' },
        public: true,
      },
    ],
  }
  const mockSpotifyApi = {
    currentUser: {
      playlists: {
        playlists: jest.fn().mockResolvedValue(mockPlaylists),
      },
    },
  }
  return {
    SpotifyApi: {
      withAccessToken: jest.fn(() => mockSpotifyApi),
    },
  }
})

// Type assertion for mocked function
const mockedHeaders = headers as jest.Mock
const mockedCookies = cookies as jest.Mock

describe('API Route: /api/spotify/playlists', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  beforeEach(() => {
    mockedHeaders.mockReturnValue(new Headers())
    mockedCookies.mockReturnValue({
      getAll: () => [],
    })
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET(
      new Request('http://localhost/api/spotify/playlists')
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated or token is missing.')
    expect(mockAuth).toHaveBeenCalled()
  })

  it('should return a list of preset and user playlists on success', async () => {
    mockAuth.mockResolvedValue({
      accessToken: 'fake-access-token',
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/playlists')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.presetPlaylists).toBeDefined()
    expect(data.presetPlaylists.length).toBe(3)
    expect(data.userPlaylists).toBeDefined()
    expect(data.userPlaylists.length).toBe(1)
    expect(data.userPlaylists[0].name).toBe('User Playlist 1')
    expect(SpotifyApi.withAccessToken).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        access_token: 'fake-access-token',
      })
    )
  })

  it('should return 500 Internal Server Error if the Spotify API fails', async () => {
    mockAuth.mockResolvedValue({
      accessToken: 'fake-access-token',
    })

    const mockSpotifyApiWithError = {
      currentUser: {
        playlists: {
          playlists: jest
            .fn()
            .mockRejectedValue(new Error('Spotify API failed')),
        },
      },
    }
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(
      mockSpotifyApiWithError
    )

    const response = await GET(
      new Request('http://localhost/api/spotify/playlists')
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
