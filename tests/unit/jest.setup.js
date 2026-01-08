// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

// JSDOM doesn't fully implement crypto. We need to mock randomUUID.
// This ensures the global crypto object exists before we try to modify it.
if (typeof global.crypto === 'undefined') {
  Object.defineProperty(global, 'crypto', {
    value: {},
    configurable: true,
  })
}
const mockRandomUUID = jest.fn(() => 'mock-client-id-12345')
Object.defineProperty(global.crypto, 'randomUUID', {
  value: mockRandomUUID,
  configurable: true,
})

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
