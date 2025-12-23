/**
 * @jest-environment node
 */
import { POST } from '@/app/api/internal/token-delivery/route'
import { NextRequest } from 'next/server'
import logger from '@/utils/logger'
import { jest } from '@jest/globals'

// Mock the logger to spy on its methods
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}))

describe('POST /api/internal/token-delivery', () => {
  const mockJson = jest.fn()
  const mockStatus = jest.fn().mockReturnThis()

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_TOKEN_DELIVERY_SECRET = 'test-secret'
    mockJson.mockClear()
  })

  afterEach(() => {
    delete process.env.INTERNAL_TOKEN_DELIVERY_SECRET
  })

  it('should return 401 Unauthorized if the secret is incorrect', async () => {
    const req = {
      headers: new Headers({
        'x-internal-token-secret': 'wrong-secret',
      }),
      json: () => Promise.resolve({ sub: 'user123' }),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 401 Unauthorized if the secret is missing and one is expected', async () => {
    const req = {
      headers: new Headers(),
      json: () => Promise.resolve({ sub: 'user123' }),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 200 OK and log the payload if the secret is correct', async () => {
    const payload = { sub: 'user123', provider: 'spotify' }
    const req = {
      headers: new Headers({
        'x-internal-token-secret': 'test-secret',
      }),
      json: () => Promise.resolve(payload),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(logger.info).toHaveBeenCalledWith(
      { subject: 'user123' },
      'Received token-delivery'
    )
  })

  it('should return 200 OK if no secret is expected in the environment', async () => {
    delete process.env.INTERNAL_TOKEN_DELIVERY_SECRET
    const payload = { provider: 'strava' }
    const req = {
      headers: new Headers(),
      json: () => Promise.resolve(payload),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(logger.info).toHaveBeenCalledWith(
      { subject: 'strava' },
      'Received token-delivery'
    )
  })

  it('should handle generic errors and return a 500 status', async () => {
    const error = new Error('Something went wrong')
    const req = {
      headers: new Headers({
        'x-internal-token-secret': 'test-secret',
      }),
      json: () => Promise.reject(error),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('server_error')
    expect(logger.error).toHaveBeenCalledWith('token-delivery error:', error)
  })
})
