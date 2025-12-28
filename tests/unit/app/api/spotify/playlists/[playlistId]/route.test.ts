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
        next: null,
      },
    }
    const mockGetPlaylist = jest.fn().mockResolvedValue(mockPlaylist)
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: { getPlaylist: mockGetPlaylist },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123')
    const context = { params: { playlistId: '123' } }

    // Act
    const response = await GET(req, context)
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
          duration: '3:00',
        },
        {
          uri: 'spotify:track:2',
          name: 'Track 2',
          artist: 'Artist 2',
          duration: '4:00',
        },
      ],
    })
  })

  it('should handle pagination and fetch all tracks', async () => {
    // Arrange
    const mockSession = { accessToken: 'test-token' }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const mockPlaylistPage1 = {
      id: '123',
      name: 'Test Playlist',
      description: 'A test playlist',
      images: [{ url: 'http://example.com/image.jpg' }],
      owner: { display_name: 'Test User' },
      tracks: {
        items: new Array(100).fill(null).map((_, i) => ({
          track: {
            type: 'track',
            uri: `spotify:track:${i}`,
            name: `Track ${i}`,
            artists: [{ name: `Artist ${i}` }],
            duration_ms: 180000,
          },
        })),
        next: 'http://localhost/api/spotify/playlists/123?offset=100&limit=100',
      },
    }
    const mockPlaylistPage2 = {
      items: new Array(50).fill(null).map((_, i) => ({
        track: {
          type: 'track',
          uri: `spotify:track:${100 + i}`,
          name: `Track ${100 + i}`,
          artists: [{ name: `Artist ${100 + i}` }],
          duration_ms: 180000,
        },
      })),
      next: null,
    }
    const mockGetPlaylist = jest.fn().mockResolvedValue(mockPlaylistPage1)
    const mockGetPlaylistItems = jest.fn().mockResolvedValue(mockPlaylistPage2)
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: {
        getPlaylist: mockGetPlaylist,
        getPlaylistItems: mockGetPlaylistItems,
      },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123')
    const context = { params: { playlistId: '123' } }

    // Act
    const response = await GET(req, context)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.tracks.length).toBe(150)
  })

  it('should handle pagination with exactly 100 tracks', async () => {
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
        items: new Array(100).fill(null).map((_, i) => ({
          track: {
            type: 'track',
            uri: `spotify:track:${i}`,
            name: `Track ${i}`,
            artists: [{ name: `Artist ${i}` }],
            duration_ms: 180000,
          },
        })),
        next: null,
      },
    }
    const mockGetPlaylist = jest.fn().mockResolvedValue(mockPlaylist)
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: { getPlaylist: mockGetPlaylist },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123')
    const context = { params: { playlistId: '123' } }

    // Act
    const response = await GET(req, context)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.tracks.length).toBe(100)
  })

  it('should handle pagination with exactly 500 tracks', async () => {
    // Arrange
    const mockSession = { accessToken: 'test-token' }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const mockPlaylistPage1 = {
      id: '123',
      name: 'Test Playlist',
      description: 'A test playlist',
      images: [{ url: 'http://example.com/image.jpg' }],
      owner: { display_name: 'Test User' },
      tracks: {
        items: new Array(100).fill(null).map((_, i) => ({
          track: {
            type: 'track',
            uri: `spotify:track:${i}`,
            name: `Track ${i}`,
            artists: [{ name: `Artist ${i}` }],
            duration_ms: 180000,
          },
        })),
        next: 'http://localhost/api/spotify/playlists/123?offset=100&limit=100',
      },
    }
    const mockGetPlaylist = jest.fn().mockResolvedValue(mockPlaylistPage1)
    const mockGetPlaylistItems = jest.fn().mockImplementation((_, __, ___, ____, offset) => {
      const page = Math.floor(offset / 100)
      if (page < 5) {
        return Promise.resolve({
          items: new Array(100).fill(null).map((_, i) => ({
            track: {
              type: 'track',
              uri: `spotify:track:${offset + i}`,
              name: `Track ${offset + i}`,
              artists: [{ name: `Artist ${offset + i}` }],
              duration_ms: 180000,
            },
          })),
          next: `http://localhost/api/spotify/playlists/123?offset=${offset + 100}&limit=100`,
        })
      } else {
        return Promise.resolve({ items: [], next: null })
      }
    })
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      playlists: {
        getPlaylist: mockGetPlaylist,
        getPlaylistItems: mockGetPlaylistItems,
      },
    })

    const req = new Request('http://localhost/api/spotify/playlists/123')
    const context = { params: { playlistId: '123' } }

    // Act
    const response = await GET(req, context)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.tracks.length).toBe(500)
  })
})
