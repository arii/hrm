/**
 * @jest-environment node
 */
// tests/unit/utils/urls.test.ts
import {
  getBasePath,
  getWebSocketURL,
  getAPIURL,
  getSpotifyCallbackURL,
  withBasePath,
  getInternalApiUrl,
} from '@/utils/urls'

const ENV_KEYS = [
  'NEXT_PUBLIC_BASE_PATH',
  'NEXTAUTH_URL',
  'SPOTIFY_CALLBACK_URL',
  'NEXT_PUBLIC_WS_URL',
  'NEXT_PUBLIC_API_URL',
  'PORT',
] as const

let savedEnv: Record<string, string | undefined>

beforeEach(() => {
  savedEnv = {}
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
  for (const key of ENV_KEYS) delete process.env[key]
  delete (global as Record<string, unknown>).window
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
  delete (global as Record<string, unknown>).window
})

function stubWindow(origin: string) {
  const url = new URL(origin)
  ;(global as Record<string, unknown>).window = {
    location: {
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
    },
  }
}

describe('getBasePath', () => {
  it('prefers explicit NEXT_PUBLIC_BASE_PATH', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    process.env.NEXTAUTH_URL = 'https://example.com/other'
    expect(getBasePath()).toBe('/hrm')
  })

  it('trims a trailing slash from the explicit value', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm/'
    expect(getBasePath()).toBe('/hrm')
  })

  it('derives the subpath from NEXTAUTH_URL when unset', () => {
    process.env.NEXTAUTH_URL = 'https://dev-onasafari.ddns.net:8443/hrm'
    expect(getBasePath()).toBe('/hrm')
  })

  it('returns empty string for root serving', () => {
    process.env.NEXTAUTH_URL = 'https://onasafari.ddns.net'
    expect(getBasePath()).toBe('')
  })

  it('returns empty string when no env is set', () => {
    expect(getBasePath()).toBe('')
  })
})

describe('getWebSocketURL', () => {
  it('prefixes the client URL with the base path', () => {
    stubWindow('https://dev-onasafari.ddns.net:8443')
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(getWebSocketURL()).toBe('wss://dev-onasafari.ddns.net:8443/hrm/ws')
  })

  it('builds a root URL without a base path', () => {
    stubWindow('http://127.0.0.1:3000')
    expect(getWebSocketURL()).toBe('ws://127.0.0.1:3000/ws')
  })

  it('preserves the subpath for server-side URLs', () => {
    process.env.NEXTAUTH_URL = 'https://dev-onasafari.ddns.net:8443/hrm'
    expect(getWebSocketURL()).toBe('wss://dev-onasafari.ddns.net:8443/hrm/ws')
  })
})

describe('getAPIURL', () => {
  it('prefixes the client URL with the base path', () => {
    stubWindow('https://dev-onasafari.ddns.net:8443')
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(getAPIURL('users')).toBe(
      'https://dev-onasafari.ddns.net:8443/hrm/api/users'
    )
  })

  it('builds a root URL without a base path', () => {
    stubWindow('http://127.0.0.1:3000')
    expect(getAPIURL('/users')).toBe('http://127.0.0.1:3000/api/users')
  })
})

describe('withBasePath', () => {
  it('prefixes root-absolute paths when configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(withBasePath('/api/users')).toBe('/hrm/api/users')
  })

  it('leaves paths alone without a base path', () => {
    expect(withBasePath('/api/users')).toBe('/api/users')
  })

  it('passes through absolute and protocol-relative URLs', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(withBasePath('https://api.spotify.com/v1/me')).toBe(
      'https://api.spotify.com/v1/me'
    )
    expect(withBasePath('//cdn.example.com/x.js')).toBe(
      '//cdn.example.com/x.js'
    )
  })

  it('is idempotent for already-prefixed paths', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(withBasePath('/hrm/api/users')).toBe('/hrm/api/users')
    expect(withBasePath('/hrm')).toBe('/hrm')
  })
})

describe('getInternalApiUrl', () => {
  it('targets localhost with the configured port and base path', () => {
    process.env.PORT = '3000'
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(getInternalApiUrl('internal/token-delivery')).toBe(
      'http://127.0.0.1:3000/hrm/api/internal/token-delivery'
    )
  })

  it('defaults the port and omits the base path at root', () => {
    expect(getInternalApiUrl('/internal/health/services')).toBe(
      'http://127.0.0.1:3000/api/internal/health/services'
    )
  })
})

describe('getAPIURL server branch', () => {
  it('calls back over localhost, never the public URL', () => {
    process.env.PORT = '3000'
    process.env.NEXTAUTH_URL = 'https://dev-onasafari.ddns.net:8443/hrm'
    expect(getAPIURL('internal/token-delivery')).toBe(
      'http://127.0.0.1:3000/hrm/api/internal/token-delivery'
    )
  })
})

describe('getSpotifyCallbackURL', () => {
  it('prefers the explicit SPOTIFY_CALLBACK_URL', () => {
    process.env.SPOTIFY_CALLBACK_URL =
      'https://dev-onasafari.ddns.net:8443/hrm/callback/spotify'
    process.env.NEXTAUTH_URL = 'https://example.com/other'
    expect(getSpotifyCallbackURL()).toBe(
      'https://dev-onasafari.ddns.net:8443/hrm/callback/spotify'
    )
  })

  it('mirrors NextAuth subpath behavior without the explicit var', () => {
    process.env.NEXTAUTH_URL = 'https://dev-onasafari.ddns.net:8443/hrm'
    expect(getSpotifyCallbackURL()).toBe(
      'https://dev-onasafari.ddns.net:8443/hrm/callback/spotify'
    )
  })

  it('uses the default callback path for root serving', () => {
    process.env.NEXTAUTH_URL = 'https://onasafari.ddns.net'
    expect(getSpotifyCallbackURL()).toBe(
      'https://onasafari.ddns.net/api/auth/callback/spotify'
    )
  })
})
