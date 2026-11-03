// tests/unit/app/api/spotify/search/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/search/route'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

global.fetch = jest.fn()
const mockedGetServerSession = getServerSession as jest.Mock
const mockedFetch = global.fetch as jest.Mock

describe('API Route: /api/spotify/search', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('should return 400 when no query is provided', async () => {
    const req = new NextRequest('http://localhost/api/spotify/search')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No query provided')
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/spotify/search?q=abba')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
  })

  it('should proxy search results on success', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tracks: { items: [{ id: 't1' }] } }),
    })

    const req = new NextRequest('http://localhost/api/spotify/search?q=abba')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tracks.items).toHaveLength(1)
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=abba'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
      })
    )
  })

  it('should return 401 when the Spotify token expired', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })
    mockedFetch.mockResolvedValue({ ok: false, status: 401 })

    const req = new NextRequest('http://localhost/api/spotify/search?q=abba')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Token expired')
  })

  it('should forward Spotify API error statuses', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    })

    const req = new NextRequest('http://localhost/api/spotify/search?q=abba')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Spotify API error: 429')
  })

  it('should return 500 when the fetch throws', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'tok' })
    mockedFetch.mockRejectedValue(new Error('boom'))

    const req = new NextRequest('http://localhost/api/spotify/search?q=abba')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
