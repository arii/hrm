import { vi, expect, afterEach } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock global fetch
global.fetch = vi.fn()

// Run cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(() => Promise.resolve(null)),
}))

// Mock @spotify/web-api-ts-sdk
vi.mock('@spotify/web-api-ts-sdk', () => {
  const mockSDK = {
    player: {
      play: vi.fn(),
      pause: vi.fn(),
    },
  }
  return {
    SpotifyApi: {
      withClientCredentials: vi.fn(() => mockSDK),
      withAccessToken: vi.fn(() => mockSDK),
    },
    AccessToken: vi.fn(),
  }
})

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock environment variables for tests
process.env.NEXTAUTH_SECRET = 'test-secret-for-vitest'
