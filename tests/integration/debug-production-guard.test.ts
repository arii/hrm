import { NextRequest } from 'next/server'

// Mock next-auth/middleware before importing middleware
jest.mock('next-auth/middleware', () => ({
  withAuth: jest.fn((handler: (req: NextRequest) => void) =>
    jest.fn((req: NextRequest, _event: unknown) => handler(req))
  ),
}))

import middleware from '../../app/middleware'

describe('Debug Production Guard', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.clearAllMocks()
  })

  it('should block /api/debug in production', async () => {
    process.env.NODE_ENV = 'production'

    const req = {
      nextUrl: {
        pathname: '/api/debug/reset',
        clone: jest.fn().mockReturnValue({
          searchParams: {
            get: jest.fn().mockReturnValue(null),
          },
        }),
      },
    } as unknown as NextRequest

    // @ts-expect-error: mocking
    const res = await middleware(req, {})

    expect(res).toBeDefined()
    expect(res?.status).toBe(404)
    const body = await res?.json()
    expect(body.error).toBe('Endpoint unavailable in production')
  })

  it('should allow /api/debug in development', async () => {
    process.env.NODE_ENV = 'development'
    const req = {
      nextUrl: {
        pathname: '/api/debug/reset',
        clone: jest.fn().mockReturnValue({
          searchParams: {
            get: jest.fn().mockReturnValue(null),
          },
        }),
      },
    } as unknown as NextRequest

    // @ts-expect-error: mocking
    const res = await middleware(req, {})

    // In our implementation, it should call authMiddleware, which calls NextResponse.next()
    expect(res).toBeDefined()
    expect(res?.status).toBe(200)
  })
})
