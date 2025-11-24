
// tests/unit/utils/urls.test.ts
import {
  getBaseURL,
  getWebSocketURL,
  getAPIURL,
  getSpotifyCallbackURL,
} from '../../../utils/urls'

describe('utils/urls', () => {
  const originalWindow = global.window
  const originalProcessEnv = process.env

  beforeEach(() => {
    // Reset mocks before each test
    global.window = originalWindow
    process.env = { ...originalProcessEnv }
  })

  afterAll(() => {
    // Restore original globals after all tests
    global.window = originalWindow
    process.env = originalProcessEnv
  })

  describe('getBaseURL', () => {
    it('should return window.location.origin on the client-side', () => {
      // @ts-ignore
      global.window = { location: { origin: 'https://client.com' } }
      expect(getBaseURL()).toBe('https://client.com')
    })

    it('should prioritize NEXTAUTH_URL on the server-side', () => {
      // @ts-ignore
      global.window = undefined
      process.env.NEXTAUTH_URL = 'https://nextauth.com'
      process.env.BASE_URL = 'https://base.com'
      expect(getBaseURL()).toBe('https://nextauth.com')
    })

    it('should use BASE_URL if NEXTAUTH_URL is not set', () => {
      // @ts-ignore
      global.window = undefined
      delete process.env.NEXTAUTH_URL
      process.env.BASE_URL = 'https://base.com'
      expect(getBaseURL()).toBe('https://base.com')
    })

    it('should fall back to the default URL on the server-side', () => {
      // @ts-ignore
      global.window = undefined
      delete process.env.NEXTAUTH_URL
      delete process.env.BASE_URL
      expect(getBaseURL()).toBe('http://127.0.0.1:3000')
    })
  })

  describe('getWebSocketURL', () => {
    it('should return a ws:// URL on the client-side with http', () => {
      // @ts-ignore
      global.window = {
        location: { protocol: 'http:', host: 'client.com' },
      }
      expect(getWebSocketURL()).toBe('ws://client.com/ws')
    })

    it('should return a wss:// URL on the client-side with https', () => {
      // @ts-ignore
      global.window = {
        location: { protocol: 'https:', host: 'secure-client.com' },
      }
      expect(getWebSocketURL()).toBe('wss://secure-client.com/ws')
    })

    it('should return a ws:// URL on the server-side with http', () => {
      // @ts-ignore
      global.window = undefined
      process.env.BASE_URL = 'http://server.com'
      expect(getWebSocketURL()).toBe('ws://server.com/ws')
    })

    it('should return a wss:// URL on the server-side with https', () => {
      // @ts-ignore
      global.window = undefined
      process.env.BASE_URL = 'https://secure-server.com'
      expect(getWebSocketURL()).toBe('wss://secure-server.com/ws')
    })
  })

  describe('getAPIURL', () => {
    it('should return a client-relative API URL', () => {
      // @ts-ignore
      global.window = { location: { origin: 'https://client.com' } }
      expect(getAPIURL('test')).toBe('https://client.com/api/test')
    })

    it('should handle leading slashes in the endpoint', () => {
      // @ts-ignore
      global.window = { location: { origin: 'https://client.com' } }
      expect(getAPIURL('/test')).toBe('https://client.com/api/test')
    })

    it('should return a server-relative API URL', () => {
      // @ts-ignore
      global.window = undefined
      process.env.BASE_URL = 'http://server.com'
      expect(getAPIURL('test')).toBe('http://server.com/api/test')
    })
  })

  describe('getSpotifyCallbackURL', () => {
    it('should use the SPOTIFY_CALLBACK_URL env var if set', () => {
      process.env.SPOTIFY_CALLBACK_URL = 'https://spotify-callback.com'
      expect(getSpotifyCallbackURL()).toBe('https://spotify-callback.com')
    })

    it('should construct the URL from getBaseURL if not set', () => {
      // @ts-ignore
      global.window = undefined
      delete process.env.SPOTIFY_CALLBACK_URL
      process.env.BASE_URL = 'http://base.com'
      expect(getSpotifyCallbackURL()).toBe(
        'http://base.com/api/auth/callback/spotify'
      )
    })
  })
})
