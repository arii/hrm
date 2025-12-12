// tests/unit/app/api/auth/nextauth.test.ts
/** @jest-environment node */

import { GET, POST } from '@/app/api/auth/[...nextauth]/route'

// Mock 'next-auth' to prevent TypeError during initialization
jest.mock('next-auth', () => ({
  __esModule: true, // This is important for ESM compatibility in Jest
  default: jest.fn(() => 'mockNextAuthHandler'),
}))

describe('API Route: /api/auth/[...nextauth]', () => {
  it('should export GET and POST handlers', () => {
    // The actual NextAuth handler is a complex function.
    // Here, we're just confirming that our route file correctly
    // configures and exports the handlers. The core logic is tested
    // in `tests/unit/lib/auth.test.ts`.
    expect(GET).toBeDefined()
    expect(POST).toBeDefined()
    expect(typeof GET).toBe('string')
    expect(typeof POST).toBe('string')
    expect(GET).toEqual('mockNextAuthHandler')
    expect(POST).toEqual('mockNextAuthHandler')
  })
})
