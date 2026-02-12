import { NextRequestWithAuth } from 'next-auth/middleware'

// Mock next-auth/middleware before importing proxy
jest.mock('next-auth/middleware', () => ({
  withAuth: jest.fn((handler: (req: NextRequestWithAuth) => void) =>
    jest.fn((req: NextRequestWithAuth) => handler(req))
  ),
}))

import { proxy } from '../../proxy'

describe('Debug Production Guard', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  const createReq = (path: string) =>
    ({
      nextUrl: {
        pathname: path,
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    }) as unknown as NextRequestWithAuth

  it('should block /api/debug in production', async () => {
    process.env.NODE_ENV = 'production'

    const req = createReq('/api/debug/reset')

    // @ts-expect-error: mocking middleware call
    const res = await proxy(req, {} as any)

    expect(res).toBeDefined()
    expect(res?.status).toBe(404)
    const body = await res?.json()
    expect(body.error).toBe('Endpoint unavailable in production')
  })

  it('should allow /api/debug in development', async () => {
    process.env.NODE_ENV = 'development'
    const req = createReq('/api/debug/reset')

    // @ts-expect-error: mocking middleware call
    const res = await proxy(req, {} as any)

    // Continuation response (NextResponse.next())
    expect(res).toBeDefined()
    expect(res?.status).toBe(200)
  })
})
