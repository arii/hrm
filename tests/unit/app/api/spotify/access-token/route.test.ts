// tests/unit/app/api/spotify/access-token/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/access-token/route'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { getToken } from 'next-auth/jwt'
import { serviceContainer } from '@/lib/serviceContainer'
import { NextResponse } from 'next/server'

// 1. Mock NextAuth dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// 2. Mock the Service Container and the SpotifyService
const mockHandleTokenUpdate = jest.fn()
jest.mock('@/lib/serviceContainer', () => ({
  serviceContainer: {
    get: jest.fn(() => ({
      handleTokenUpdate: mockHandleTokenUpdate,
    })),
  },
}))

// Mock env
jest.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret',
  },
}))

describe('API Route: /api/spotify/access-token', () => {
  const mockedGetServerSession = getServerSession as jest.Mock
  const mockedGetToken = getToken as jest.Mock
  const mockedServiceContainerGet = serviceContainer.get as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Default valid session
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'session-access-token',
    })
  })

  it('should return 401 if no session exists', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const response = await GET(new Request('http://localhost/api/spotify/access-token'))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toMatch(/Not authenticated/)
  })

  it('should hydrate the SpotifyService when a refresh token exists in JWT', async () => {
    // Setup: User has a session AND a valid JWT with refresh token
    mockedGetToken.mockResolvedValue({
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      sub: 'test-user-id'
    })

    const response = await GET(new Request('http://localhost/api/spotify/access-token'))
    await response.json() // Consume body

    // Assert: Service container was accessed
    expect(mockedServiceContainerGet).toHaveBeenCalledWith('spotifyService')

    // Assert: Data was passed to handleTokenUpdate
    expect(mockHandleTokenUpdate).toHaveBeenCalledWith(expect.objectContaining({
      access_token: 'jwt-access-token',
      refresh_token: 'jwt-refresh-token',
      provider: 'spotify'
    }))
  })

  it('should NOT crash the request if service hydration fails', async () => {
    // Setup: Service container throws an error
    mockedGetToken.mockResolvedValue({ accessToken: 't', refreshToken: 'r' })
    mockedServiceContainerGet.mockImplementationOnce(() => {
      throw new Error('Service not ready')
    })

    const response = await GET(new Request('http://localhost/api/spotify/access-token'))
    const data = await response.json()

    // Assert: The client still gets their token despite internal error
    expect(response.status).toBe(200)
    expect(data.accessToken).toBe('session-access-token')
  })

  it('should return 200 and token even if no refresh token is present', async () => {
    mockedGetToken.mockResolvedValue({ accessToken: 'jwt-access-token' }) // No refresh token

    const response = await GET(new Request('http://localhost/api/spotify/access-token'))

    // Assert: Should not attempt to hydrate
    expect(mockedServiceContainerGet).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })
})