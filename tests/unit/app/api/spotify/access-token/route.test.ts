// tests/unit/app/api/spotify/access-token/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/access-token/route'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Type assertion for mocked function
const mockedGetServerSession = getServerSession as jest.Mock

describe('API Route: /api/spotify/access-token', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated or token is missing.')
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
  })

  it('should return 401 Unauthorized if session has RefreshAccessTokenError', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'dummy-token', // Add a token to pass the first check
      error: 'RefreshAccessTokenError',
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Token refresh failed. Please re-authenticate.')
  })

  it('should return the access token on success', async () => {
    const fakeToken = 'fake-spotify-access-token'
    mockedGetServerSession.mockResolvedValue({
      accessToken: fakeToken,
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.accessToken).toBe(fakeToken)
  })

  it('should return 500 Internal Server Error if getServerSession fails', async () => {
    mockedGetServerSession.mockRejectedValue(new Error('Test error'))

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
