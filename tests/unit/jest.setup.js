// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS = '2'
