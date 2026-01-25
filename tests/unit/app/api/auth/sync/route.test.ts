// tests/unit/app/api/auth/sync/route.test.ts
import { POST } from '@/app/api/auth/sync/route'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { env } from '@/lib/env'

// Mock dependencies
jest.mock('next-auth/jwt')
jest.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret',
  },
}))

global.fetch = jest.fn()

describe('POST /api/auth/sync', () => {
  const mockedGetToken = getToken as jest.Mock
  const mockedFetch = fetch as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if token is invalid or missing', async () => {
    mockedGetToken.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/auth/sync', {
      method: 'POST',
    })
    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('should return 500 if internal sync request fails', async () => {
    mockedGetToken.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      providerAccountId: 'test-account-id',
    })
    mockedFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal Server Error' })
    const req = new NextRequest('http://localhost/api/auth/sync', {
      method: 'POST',
    })
    const response = await POST(req)
    expect(response.status).toBe(500)
  })

  it('should return 200 and sync token if token is valid', async () => {
    mockedGetToken.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      providerAccountId: 'test-account-id',
    })
    mockedFetch.mockResolvedValue({ ok: true })
    const req = new NextRequest('http://localhost/api/auth/sync', {
      method: 'POST',
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockedFetch).toHaveBeenCalledWith(expect.any(String), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': 'test-secret',
      },
      body: JSON.stringify({
        provider: 'spotify',
        sub: 'test-account-id',
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        expires_in: expect.any(Number),
        scope: '',
        obtainedAt: expect.any(Number),
      }),
    })
  })
})
