import { NextRequestWithAuth } from 'next-auth/middleware'

// Mock next-auth/middleware before importing middleware
jest.mock('next-auth/middleware', () => ({
  withAuth: jest.fn((handler: (req: NextRequestWithAuth) => void) =>
    jest.fn((req: NextRequestWithAuth) => handler(req))
  ),
}))

import middleware from '../../app/middleware'

describe('Debug Production Guard', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should block /api/debug in production', async () => {
    process.env.NODE_ENV = 'production'

    const req = {
      nextUrl: {
        pathname: '/api/debug/reset',
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    } as unknown as NextRequestWithAuth

    // @ts-expect-error: mocking middleware call
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
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    } as unknown as NextRequestWithAuth

    // @ts-expect-error: mocking middleware call
    const res = await middleware(req, {})

    // Continuation response (NextResponse.next())
    expect(res).toBeDefined()
    // NextResponse.next() typically has status 200 in mocked environment
    // but if it returned undefined it would fail here.
    expect(res?.status).toBe(200)
  })
})
