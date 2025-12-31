/**
 * @jest-environment node
 */
import {
  createRateLimiters,
  getKeyGenerator,
} from '../../../../lib/middleware/rateLimit'
import { env } from '../../../../lib/env'
import { Request, Response } from 'express'
import { Socket } from 'net'

// Mock the env module to control NODE_ENV for tests
jest.mock('../../../../lib/env', () => ({
  env: {
    NODE_ENV: 'production',
  },
}))

// A simple mock for the 'next' function
const mockNext = jest.fn()

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Reset mocks and environment before each test
    jest.clearAllMocks()
    ;(env as { NODE_ENV: string }).NODE_ENV = 'production'
  })

  describe('createRateLimiters', () => {
    it('should return real rate limiters when NODE_ENV is not "test"', () => {
      const limiters = createRateLimiters()

      // The real rate limiter is a complex function. The no-op is a simple arrow function.
      // We can check the function's structure or length as a proxy.
      expect(limiters.spotifyApiLimiter.toString()).not.toContain('=> next()')
      expect(limiters.internalApiLimiter.toString()).not.toContain('=> next()')
      expect(limiters.generalApiLimiter.toString()).not.toContain('=> next()')
    })

    it('should return no-op middleware when NODE_ENV is "test"', () => {
      ;(env as { NODE_ENV: string }).NODE_ENV = 'test'

      const limiters = createRateLimiters()

      // The no-op functions should just call next() and nothing else.
      const mockReq = {} as Request
      const mockRes = {} as Response

      limiters.spotifyApiLimiter(mockReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(1)

      limiters.internalApiLimiter(mockReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(2)

      limiters.generalApiLimiter(mockReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(3)
    })
  })

  describe('getKeyGenerator', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: { 'x-forwarded-for': '1.1.1.1' },
        socket: { remoteAddress: '2.2.2.2' } as Socket,
      } as unknown as Request
      expect(getKeyGenerator(req)).toBe('1.1.1.1')
    })

    it('should extract the first IP from a comma-separated x-forwarded-for header', () => {
      const req = {
        headers: { 'x-forwarded-for': '1.1.1.1, 3.3.3.3, 4.4.4.4' },
        socket: { remoteAddress: '2.2.2.2' } as Socket,
      } as unknown as Request
      expect(getKeyGenerator(req)).toBe('1.1.1.1')
    })

    it('should fall back to socket.remoteAddress if x-forwarded-for is not present', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '2.2.2.2' } as Socket,
      } as unknown as Request
      expect(getKeyGenerator(req)).toBe('2.2.2.2')
    })

    it('should return "unknown" if no IP can be found', () => {
      const req = {
        headers: {},
        socket: {} as Socket, // No remoteAddress
      } as unknown as Request
      expect(getKeyGenerator(req)).toBe('unknown')
    })
  })
})
