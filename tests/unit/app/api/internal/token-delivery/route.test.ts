/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals'
import { POST } from '@/app/api/internal/token-delivery/route'
import { NextRequest } from 'next/server'
import { getSpotifyService } from '@/lib/services'
import { ServiceInitializationError } from '@/lib/errors'

// Mock services
jest.mock('@/lib/services', () => ({
  getSpotifyService: jest.fn(),
}))

// Mock env
jest.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret',
    INTERNAL_TOKEN_DELIVERY_SECRET: undefined,
  },
}))

// Mock logger
jest.mock('@/utils/logger.server', () => ({
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

const validTokenData = {
  provider: 'spotify',
  sub: 'test-user',
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  scope: 'test-scope',
  obtainedAt: Date.now(),
}

describe('POST /api/internal/token-delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSpotifyService as jest.Mock).mockReturnValue(mockSpotifyService)
  })

  it('should return 401 if secret header is missing or invalid', async () => {
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'wrong-secret',
        },
        body: JSON.stringify(validTokenData),
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized: Missing or invalid secret.' })
  })

  it('should return 400 if body structure is invalid', async () => {
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
        body: JSON.stringify({ invalid: 'data' }),
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ error: 'Bad Request: Invalid token structure.' })
  })

  it('should return 200 OK if secret header and body are correct', async () => {
    mockSpotifyService.isReady.mockReturnValue(true)
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
        body: JSON.stringify(validTokenData),
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true, message: 'Token delivered successfully.' })
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(
      validTokenData
    )
  })

  it('should return 503 if service is not initialized', async () => {
    ;(getSpotifyService as jest.Mock).mockImplementationOnce(() => {
      throw new ServiceInitializationError('SpotifyService')
    })

    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
        body: JSON.stringify(validTokenData),
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error).toContain('not initialized')
  })

  it('should return 500 if an unexpected error occurs', async () => {
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
})
