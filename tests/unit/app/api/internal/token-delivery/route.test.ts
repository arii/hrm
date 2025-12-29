/**
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeAll, afterAll } from '@jest/globals'
import { POST } from '@/app/api/internal/token-delivery/route'
import { NextRequest } from 'next/server'

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock Service Container
const mockSpotifyService = {
  isReady: jest.fn(),
  handleTokenUpdate: jest.fn(),
}
jest.mock('@/lib/serviceContainer', () => ({
  serviceContainer: {
    get: jest.fn((serviceName: 'spotifyService') => {
      if (serviceName === 'spotifyService') {
        return mockSpotifyService
      }
      return null
    }),
  },
}))

describe('POST /api/internal/token-delivery', () => {
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if secret header is missing or invalid', async () => {
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'wrong-secret',
        },
        body: JSON.stringify({ refresh_token: 'test' }),
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized: Missing or invalid secret.' })
  })

  it('should return 200 OK if secret header is correct', async () => {
    mockSpotifyService.isReady.mockReturnValue(true)
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
        body: JSON.stringify({ refresh_token: 'test' }),
      }
    )

    // The route handler does NOT read the body anymore, so we don't need to provide one
    // or worry about stream consumption in this unit test.

    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true, message: 'Token delivered successfully.' })
  })

  it('should return 500 if an unexpected error occurs', async () => {
    // Force an error by mocking ApiError or something else if possible.
    // However, since the logic is very simple, it's hard to make it fail unexpectedly
    // without mocking globals or the request object throwing.
    // Let's mock headers.get to throw.
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
      }
    )
    jest.spyOn(req.headers, 'get').mockImplementationOnce(() => {
      throw new Error('Unexpected failure')
    })

    const response = await POST(req)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'server_error' })
  })

  it('should process token even if spotifyService is not ready', async () => {
    mockSpotifyService.isReady.mockReturnValue(false)
    const tokenData = {
      refresh_token: 'new-refresh-token',
      access_token: 'new-access-token',
    }
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
        body: JSON.stringify(tokenData),
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...tokenData,
        provider: 'spotify',
        sub: '',
        scope: '',
        obtainedAt: expect.any(Number),
      })
    )
    const body = await response.json()
    expect(body).toEqual({ ok: true, message: 'Token delivered successfully.' })
  })
})
