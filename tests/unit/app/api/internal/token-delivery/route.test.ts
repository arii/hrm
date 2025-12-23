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
  },
}))

describe('POST /api/internal/token-delivery', () => {
  const originalSecret = process.env.INTERNAL_TOKEN_DELIVERY_SECRET

  beforeAll(() => {
    process.env.INTERNAL_TOKEN_DELIVERY_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.INTERNAL_TOKEN_DELIVERY_SECRET = originalSecret
  })

  it('should return 401 if secret header is missing or invalid', async () => {
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'wrong-secret',
        },
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('should return 200 OK if secret header is correct', async () => {
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
      }
    )

    // The route handler does NOT read the body anymore, so we don't need to provide one
    // or worry about stream consumption in this unit test.

    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true })
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
})
