// tests/unit/app/api/spotify/access-token/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/spotify/access-token/route'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

const mockedGetServerSession = getServerSession as jest.Mock

describe('API Route: /api/spotify/access-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return the access token from a valid session', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'fake-access-token',
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.accessToken).toBe('fake-access-token')
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
  })

  it('should return 401 if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated or token is missing.')
  })

  it('should return 401 if the session has a RefreshAccessTokenError', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'stale-token',
      error: 'RefreshAccessTokenError',
    })

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Token refresh failed. Please re-authenticate.')
  })

  it('should return 500 on internal server error', async () => {
    mockedGetServerSession.mockRejectedValue(new Error('Internal Error'))

    const response = await GET(
      new Request('http://localhost/api/spotify/access-token')
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
  })
})
