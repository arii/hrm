// tests/unit/app/api/spotify/devices/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/devices/route'
import { authOptions } from '@/lib/auth'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { getServerSession } from 'next-auth/next'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock SpotifyTokenManager
jest.mock('@/services/spotifyTokenManager')

// Type assertion for mocked functions
const mockedGetServerSession = getServerSession as jest.Mock
const mockedSpotifyTokenManager = SpotifyTokenManager as jest.Mock

// Mock global fetch
global.fetch = jest.fn()

describe('API Route: /api/spotify/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSpotifyTokenManager.mockClear()
  })

  it('should return a list of devices using a user session token', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'user-access-token',
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          devices: [{ id: '1', name: 'Test Device' }],
        }),
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/devices')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([{ id: '1', name: 'Test Device' }])
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: 'Bearer user-access-token',
        },
      }
    )
    expect(mockedSpotifyTokenManager).not.toHaveBeenCalled()
  })

  it('should return a list of devices using the system token as a fallback', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const mockGetValidAccessToken = jest
      .fn()
      .mockResolvedValue('system-access-token')
    mockedSpotifyTokenManager.mockImplementation(() => {
      return {
        getValidAccessToken: mockGetValidAccessToken,
      }
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          devices: [{ id: '2', name: 'System Device' }],
        }),
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/devices')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([{ id: '2', name: 'System Device' }])
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
    expect(mockGetValidAccessToken).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: 'Bearer system-access-token',
        },
      }
    )
  })

  it('should return 401 if no session or system token is available', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const mockGetValidAccessToken = jest.fn().mockResolvedValue(null)
    mockedSpotifyTokenManager.mockImplementation(() => {
      return {
        getValidAccessToken: mockGetValidAccessToken,
      }
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/devices')
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Not authenticated')
  })

  it('should return an error if the Spotify API fetch fails', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'user-access-token',
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Spotify API Error'),
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/devices')
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch devices from Spotify.')
  })

  it('should return 500 on internal server error', async () => {
    mockedGetServerSession.mockRejectedValue(new Error('Internal Error'))

    const response = await GET(
      new Request('http://localhost/api/spotify/devices')
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
