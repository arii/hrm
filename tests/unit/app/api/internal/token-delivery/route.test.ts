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
        body: JSON.stringify({}), // Body is not read, but good to have
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized: Missing or invalid secret.' })
  })

  it('should return 200 OK if secret header is correct', async () => {
    const req = new NextRequest(
      'http://localhost/api/internal/token-delivery',
      {
        method: 'POST',
        headers: {
          'x-internal-token-secret': 'test-secret',
        },
        body: JSON.stringify({}), // Body is not read
      }
    )

    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true, message: 'Token delivery acknowledged.' })
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
