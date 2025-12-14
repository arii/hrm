// tests/unit/app/api/spotify/devices/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/devices/route'
import { authOptions } from '@/lib/auth'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { getServerSession } from 'next-auth/next'

// Mock 'next-auth/next'
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
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

const mockedGetServerSession = getServerSession as jest.Mock
const mockedFetch = global.fetch as jest.Mock
const MockedSpotifyTokenManager = SpotifyTokenManager as jest.Mock

describe('API Route: /api/spotify/devices', () => {
  // Mock console methods to keep test output clean
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });
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
  })

  it('should return 401 if no user session and no system token is available', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    tokenManagerInstance.getValidAccessToken.mockResolvedValue(null)

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('No user session or valid system token')
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
    expect(tokenManagerInstance.getValidAccessToken).toHaveBeenCalledTimes(1)
  })

  it('should return devices successfully with a user session', async () => {
    const mockDevices = [{ id: '1', name: 'User Device' }]
    mockedGetServerSession.mockResolvedValue({
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
    mockedGetServerSession.mockResolvedValue(null)
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
    mockedGetServerSession.mockResolvedValue({
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
    mockedGetServerSession.mockRejectedValue(new Error('Unexpected DB error'))

    const req = new Request('http://localhost/api/spotify/devices')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
