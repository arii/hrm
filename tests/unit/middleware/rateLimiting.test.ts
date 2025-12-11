import { NextRequest } from 'next/server'
import { middleware } from '../../../middleware'
import {
  authApiLimiter,
  generalApiLimiter,
  internalApiLimiter,
  spotifyApiLimiter,
} from '../../../lib/middleware/rateLimiter'
import { getToken } from 'next-auth/jwt'

// Mock the rate limiters
jest.mock('../../../lib/middleware/rateLimiter', () => ({
  authApiLimiter: { limit: jest.fn() },
  generalApiLimiter: { limit: jest.fn() },
  internalApiLimiter: { limit: jest.fn() },
  spotifyApiLimiter: { limit: jest.fn() },
}))

// Mock next-auth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Reset mocks before each test
    ;(authApiLimiter.limit as jest.Mock).mockReset()
    ;(generalApiLimiter.limit as jest.Mock).mockReset()
    ;(internalApiLimiter.limit as jest.Mock).mockReset()
    ;(spotifyApiLimiter.limit as jest.Mock).mockReset()
  })

  it('should use the general limiter for general API routes', async () => {
    ;(generalApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 200,
      remaining: 199,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/some-route')
    await middleware(req)
    expect(generalApiLimiter.limit).toHaveBeenCalled()
  })

  it('should use the auth limiter for auth API routes', async () => {
    ;(authApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/auth/signin')
    await middleware(req)
    expect(authApiLimiter.limit).toHaveBeenCalled()
  })

  it('should use the spotify limiter for spotify API routes', async () => {
    ;(spotifyApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/spotify/playlists')
    await middleware(req)
    expect(spotifyApiLimiter.limit).toHaveBeenCalled()
  })

  it('should use the internal limiter for internal API routes', async () => {
    ;(internalApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/internal/some-route')
    await middleware(req)
    expect(internalApiLimiter.limit).toHaveBeenCalled()
  })

  it('should return a 429 response when the rate limit is exceeded', async () => {
    ;(generalApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: false,
      limit: 200,
      remaining: 0,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/some-route')
    const res = await middleware(req)
    expect(res.status).toBe(429)
  })

  it('should use the user ID for rate limiting if the user is authenticated', async () => {
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-123' })
    ;(generalApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 200,
      remaining: 199,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/some-route')
    await middleware(req)
    expect(generalApiLimiter.limit).toHaveBeenCalledWith('user-123')
  })

  it('should use the IP address for rate limiting if the user is not authenticated', async () => {
    ;(getToken as jest.Mock).mockResolvedValue(null)
    ;(generalApiLimiter.limit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 200,
      remaining: 199,
      reset: 123456,
    })
    const req = new NextRequest('http://localhost/api/some-route', {
      headers: {
        'x-forwarded-for': '123.45.67.89',
      },
    })
    await middleware(req)
    expect(generalApiLimiter.limit).toHaveBeenCalledWith('123.45.67.89')
  })
})
