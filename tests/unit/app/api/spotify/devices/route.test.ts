// tests/unit/app/api/spotify/devices/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/devices/route'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
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

// Mock SpotifyTokenManager
jest.mock('@/services/spotifyTokenManager', () => {
  return {
    SpotifyTokenManager: jest.fn().mockImplementation(() => {
      return {
        getValidAccessToken: jest.fn(),
      }
    }),
  }
})

// Mock global fetch
global.fetch = jest.fn()

const mockedHeaders = headers as jest.Mock
const mockedCookies = cookies as jest.Mock
const mockedFetch = global.fetch as jest.Mock
const MockedSpotifyTokenManager = SpotifyTokenManager as jest.Mock

describe('API Route: /api/spotify/devices', () => {
  let tokenManagerInstance: { getValidAccessToken: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    // Set up a new mock instance for each test
    MockedSpotifyTokenManager.mockClear()
    tokenManagerInstance =
      new (MockedSpotifyTokenManager as jest.Mock<SpotifyTokenManager>)(
        'client-id',
        'client-secret'
      )
    MockedSpotifyTokenManager.mockImplementation(() => tokenManagerInstance)
    mockedHeaders.mockReturnValue(new Headers())
    mockedCookies.mockReturnValue({
      getAll: () => [],
    })
  })

  it('should return 401 if no user session and no system token is available', async () => {
    mockAuth.mockResolvedValue(null)
    tokenManagerInstance.getValidAccessToken.mockResolvedValue(null)

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('No user session or valid system token')
    expect(mockAuth).toHaveBeenCalled()
    expect(tokenManagerInstance.getValidAccessToken).toHaveBeenCalledTimes(1)
  })

  it('should return devices successfully with a user session', async () => {
    const mockDevices = [{ id: '1', name: 'User Device' }]
    mockAuth.mockResolvedValue({
      accessToken: 'user-access-token',
    })
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ devices: mockDevices }),
    })

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockDevices)
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/devices',
      { headers: { Authorization: 'Bearer user-access-token' } }
    )
    expect(tokenManagerInstance.getValidAccessToken).not.toHaveBeenCalled()
  })

  it('should return devices successfully with a system token fallback', async () => {
    const mockDevices = [{ id: '2', name: 'System Device' }]
    mockAuth.mockResolvedValue(null)
    tokenManagerInstance.getValidAccessToken.mockResolvedValue(
      'system-access-token'
    )
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ devices: mockDevices }),
    })

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockDevices)
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/devices',
      { headers: { Authorization: 'Bearer system-access-token' } }
    )
  })

  it('should forward Spotify API errors', async () => {
    mockAuth.mockResolvedValue({
      accessToken: 'user-access-token',
    })
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Failed to fetch devices from Spotify.')
  })

  it('should return 500 on unexpected errors', async () => {
    mockAuth.mockRejectedValue(new Error('Unexpected DB error'))

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
