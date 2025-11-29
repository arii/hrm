// tests/unit/app/api/spotify/playlists/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/playlists/route'
import { SpotifyApiService } from '@/services/spotifyApi'

// Mock the SpotifyApiService
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

const mockSdk = {
  currentUser: {
    playlists: {
      playlists: jest.fn().mockResolvedValue(mockPlaylists),
    },
  },
}

jest.mock('@/services/spotifyApi', () => ({
  SpotifyApiService: {
    getInstance: jest.fn(() => ({
      getSdk: jest.fn(() => mockSdk),
    })),
  },
}))

describe('API Route: /api/spotify/playlists', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return a list of preset and user playlists on success', async () => {
    const response = await GET(
      new Request('http://localhost/api/spotify/playlists')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.presetPlaylists).toBeDefined()
    expect(data.userPlaylists).toBeDefined()
    expect(data.userPlaylists.length).toBe(1)
    expect(data.userPlaylists[0].name).toBe('User Playlist 1')
  })

  it('should return 503 Service Unavailable if the SDK is not initialized', async () => {
    // Arrange: Mock getInstance to return a service with a null SDK
    ;(SpotifyApiService.getInstance as jest.Mock).mockReturnValueOnce({
      getSdk: () => null,
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/playlists')
    )
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toBe('Spotify service not available')
  })

  it('should return 500 Internal Server Error if the Spotify API fails', async () => {
    // Arrange: Mock the playlists method to reject
    mockSdk.currentUser.playlists.playlists.mockRejectedValueOnce(
      new Error('Spotify API failed')
    )

    const response = await GET(
      new Request('http://localhost/api/spotify/playlists')
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
