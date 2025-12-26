// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

// --- Mock next-auth ---
// This is necessary to prevent a TypeError when Jest tries to import the NextAuth.js v5 module.
// The test environment can struggle with the ESM/CJS interop.
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}))
