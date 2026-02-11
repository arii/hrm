import { NextRequestWithAuth } from 'next-auth/middleware'

// Mock next-auth/middleware before importing middleware
jest.mock('next-auth/middleware', () => ({
  withAuth: jest.fn((handler: (req: NextRequestWithAuth) => void) =>
    jest.fn((req: NextRequestWithAuth, _event: unknown) => handler(req))
  ),
}))

import middleware from '../../app/middleware'

describe('Debug Production Guard', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.clearAllMocks()
  })

  // Robustly restore NODE_ENV even if tests fail catastrophically
  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should block /api/debug in production', async () => {
    process.env.NODE_ENV = 'production'

    try {
      const req = {
        nextUrl: {
          pathname: '/api/debug/reset',
          clone: jest.fn().mockReturnValue({
            searchParams: {
              get: jest.fn().mockReturnValue(null),
            },
          }),
        },
      } as unknown as NextRequestWithAuth

      // @ts-expect-error: mocking middleware call
      const res = await middleware(req, {})

      expect(res).toBeDefined()
      expect(res?.status).toBe(404)
      const body = await res?.json()
      expect(body.error).toBe('Endpoint unavailable in production')
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('should allow /api/debug in development', async () => {
    process.env.NODE_ENV = 'development'
    try {
      const req = {
        nextUrl: {
          pathname: '/api/debug/reset',
          clone: jest.fn().mockReturnValue({
            searchParams: {
              get: jest.fn().mockReturnValue(null),
            },
          }),
        },
      } as unknown as NextRequestWithAuth

      // @ts-expect-error: mocking middleware call
      const res = await middleware(req, {})

      // In our implementation, it should call the handler which calls NextResponse.next()
      expect(res).toBeDefined()
      expect(res?.status).toBe(200)
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })
})
