// tests/unit/jest.setup.js
jest.doMock('@/lib/env', () => ({
  env: {
    SPOTIFY_CLIENT_ID: 'test_client_id',
    SPOTIFY_CLIENT_SECRET: 'test_client_secret',
    SPOTIFY_POLLING_INTERVAL_MS: 100,
    SPOTIFY_DEBUG: false,
    TESTING: true,
  },
}))
