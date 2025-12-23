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
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_TOKEN_DELIVERY_SECRET = 'test-secret'
  })

  afterEach(() => {
    delete process.env.INTERNAL_TOKEN_DELIVERY_SECRET
  })

  it('should return 401 Unauthorized if the secret is incorrect', async () => {
    const req = {
      headers: new Headers({
        'x-internal-token-secret': 'wrong-secret',
      }),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 401 Unauthorized if the secret is missing and one is expected', async () => {
    const req = {
      headers: new Headers(),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 200 OK and log the request if the secret is correct', async () => {
    const req = {
      headers: new Headers({
        'x-internal-token-secret': 'test-secret',
      }),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(logger.info).toHaveBeenCalledWith('Received token-delivery request.')
  })

  it('should return 200 OK if no secret is expected in the environment', async () => {
    delete process.env.INTERNAL_TOKEN_DELIVERY_SECRET
    const req = {
      headers: new Headers(),
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(logger.info).toHaveBeenCalledWith('Received token-delivery request.')
  })

  it('should handle generic errors and return a 500 status', async () => {
    const error = new Error('Something went wrong')
    const req = {
      headers: {
        get: jest.fn().mockImplementation(() => {
          throw error
        }),
      },
    } as unknown as NextRequest

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('server_error')
    expect(logger.error).toHaveBeenCalledWith('token-delivery error:', error)
  })
})
