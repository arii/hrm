import { GET } from '@/app/api/spotify/search/route'
import { getServerSession } from 'next-auth/next'

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Spotify Search API Route', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if no query is provided', async () => {
    const req = { url: 'http://localhost/api/spotify/search' } as Request
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toEqual({ error: 'No query provided' })
  })

  it('should return 401 if user is not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = { url: 'http://localhost/api/spotify/search?q=test' } as Request
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('should return 401 with custom error if token is expired', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'The access token expired' }),
    })
    const req = { url: 'http://localhost/api/spotify/search?q=test' } as Request
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({
      error: 'Spotify token expired',
      errorCode: 'SPOTIFY_TOKEN_EXPIRED',
    })
  })

  it('should return search results successfully', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    })
    const mockData = { tracks: { items: [{ name: 'Test Track' }] } }
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })
    const req = { url: 'http://localhost/api/spotify/search?q=test' } as Request
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(mockData)
  })

  it('should handle other Spotify API errors', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })
    const req = { url: 'http://localhost/api/spotify/search?q=test' } as Request
    const res = await GET(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toEqual({
      error: 'Spotify API error: 500',
      details: 'Internal Server Error',
    })
  })
})
