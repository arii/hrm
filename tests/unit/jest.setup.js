// tests/unit/jest.setup.js
require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

// Polyfill for TextEncoder and TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock the Spotify SDK to prevent it from trying to make real API calls
// and to control its behavior in tests.
jest.mock('@spotify/web-api-ts-sdk', () => {
  return {
    SpotifyApi: {
      withClientCredentials: jest.fn(() => ({
        currentUser: {
          playlists: {
            playlists: jest.fn().mockResolvedValue({ items: [] }),
          },
        },
        search: jest.fn().mockResolvedValue({ tracks: { items: [] } }),
      })),
      withAccessToken: jest.fn(() => ({
        player: {
          getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
          startResumePlayback: jest.fn().mockResolvedValue(null),
          pausePlayback: jest.fn().mockResolvedValue(null),
          seekToPosition: jest.fn().mockResolvedValue(null),
          setVolume: jest.fn().mockResolvedValue(null),
        },
      })),
    },
  }
})

// Mock the logger to suppress console output during tests
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))
