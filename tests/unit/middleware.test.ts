import { NextRequest } from 'next/server'
import { handleAuthProxy } from '@/middleware'

describe('handleAuthProxy', () => {
  const requestWith = (headers: Record<string, string>): NextRequest =>
    new NextRequest('https://app.internal/api/auth/session', { headers })

  // `host` is a forbidden header name (undici drops it from real
  // requests), so the host-fallback branch gets a minimal stub.
  const stubRequestWith = (headers: Record<string, string>): NextRequest =>
    ({
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    }) as unknown as NextRequest

  it('re-emits the full forwarded set with a non-default port', () => {
    const res = handleAuthProxy(
      requestWith({
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'https',
        'x-forwarded-port': '8443',
      })
    )
    expect(res.headers.get('x-forwarded-host')).toBe('example.com:8443')
    expect(res.headers.get('x-forwarded-proto')).toBe('https')
    expect(res.headers.get('x-forwarded-port')).toBe('8443')
    expect(res.headers.get('x-forwarded-ssl')).toBe('on')
  })

  it('omits the default https port', () => {
    const res = handleAuthProxy(
      requestWith({
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'https',
        'x-forwarded-port': '443',
      })
    )
    expect(res.headers.get('x-forwarded-host')).toBe('example.com')
    expect(res.headers.get('x-forwarded-port')).toBe('443')
  })

  it('never double-appends a port', () => {
    const res = handleAuthProxy(
      requestWith({
        'x-forwarded-host': 'example.com:8443',
        'x-forwarded-proto': 'https',
        'x-forwarded-port': '9443',
      })
    )
    expect(res.headers.get('x-forwarded-host')).toBe('example.com:8443')
  })

  it('leaves the ssl flag off for plain http', () => {
    const res = handleAuthProxy(
      requestWith({
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'http',
      })
    )
    expect(res.headers.get('x-forwarded-proto')).toBe('http')
    expect(res.headers.get('x-forwarded-ssl')).toBeNull()
    expect(res.headers.get('x-forwarded-port')).toBeNull()
  })

  it('falls back to the host header with https defaults', () => {
    const res = handleAuthProxy(stubRequestWith({ host: 'internal:3000' }))
    expect(res.headers.get('x-forwarded-host')).toBe('internal:3000')
    expect(res.headers.get('x-forwarded-proto')).toBe('https')
    expect(res.headers.get('x-forwarded-ssl')).toBe('on')
    expect(res.headers.get('x-forwarded-port')).toBeNull()
  })

  it('writes nothing without any host', () => {
    const res = handleAuthProxy(requestWith({}))
    expect(res.headers.get('x-forwarded-host')).toBeNull()
    expect(res.headers.get('x-forwarded-proto')).toBeNull()
  })
})
