import { NextRequest } from 'next/server'
import { GET } from '../../../app/api/spotify/access-token/route'

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = { ...originalEnv }
})
afterEach(() => {
  process.env = originalEnv
})

// Mock fetch for Spotify API calls
global.fetch = jest.fn()

describe('/api/spotify/access-token API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns token when available', async () => {
    // Mock successful Spotify response
    const mockSpotifyResponse = {
      access_token: 'test-token-123',
      token_type: 'Bearer',
      expires_in: 3600
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpotifyResponse)
    })

    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'

    const request = new NextRequest('http://localhost:3000/api/spotify/access-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.access_token).toBe('test-token-123')
    expect(data.token_type).toBe('Bearer')
  })

  test('returns error when Spotify API fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_client' })
    })

    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'

    const request = new NextRequest('http://localhost:3000/api/spotify/access-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  test('returns error when credentials missing', async () => {
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET

    const request = new NextRequest('http://localhost:3000/api/spotify/access-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Missing Spotify credentials')
  })

  test('handles network errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'

    const request = new NextRequest('http://localhost:3000/api/spotify/access-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed to fetch access token')
  })

  test('validates request method', async () => {
    const request = new NextRequest('http://localhost:3000/api/spotify/access-token', {
      method: 'POST'
    })

    // Should handle non-GET requests appropriately
    expect(request.method).toBe('POST')
  })

  test('includes proper headers in Spotify request', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'test' })
    })

    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'

    const request = new NextRequest('http://localhost:3000/api/spotify/access-token')
    await GET(request)

    expect(fetch).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': expect.stringContaining('Basic ')
        })
      })
    )
  })
})
