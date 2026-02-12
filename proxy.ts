import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse, NextFetchEvent } from 'next/server'

const API_AUTH_BASE = '/api/auth/'

const authMiddleware = withAuth(
  function middleware(req: NextRequestWithAuth) {
    if (
      process.env.NODE_ENV === 'production' &&
      req.nextUrl.pathname.startsWith('/api/debug')
    ) {
      return NextResponse.json(
        { error: 'Endpoint unavailable in production' },
        { status: 404 }
      )
    }

    if (req.nextUrl.pathname.startsWith(API_AUTH_BASE)) {
      const response = NextResponse.next()
      const forwardedHost = req.headers.get('x-forwarded-host')
      const forwardedProto = req.headers.get('x-forwarded-proto')
      const forwardedPort = req.headers.get('x-forwarded-port')
      const host = req.headers.get('host')

      const actualHost = forwardedHost || host || ''
      const actualProto = forwardedProto || 'https'
      const actualPort = forwardedPort || ''

      if (actualHost) {
        let hostWithPort = actualHost
        if (actualPort && !actualHost.includes(':')) {
          if (actualPort !== '443') {
            hostWithPort = `${actualHost}:${actualPort}`
          }
        }
        response.headers.set('x-forwarded-host', hostWithPort)
        response.headers.set('x-forwarded-proto', actualProto)
        if (actualPort) {
          response.headers.set('x-forwarded-port', actualPort)
        }
        if (actualProto === 'https') {
          response.headers.set('x-forwarded-ssl', 'on')
        }
      }
      return response
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
)

export function proxy(req: NextRequestWithAuth, event: NextFetchEvent) {
  return authMiddleware(req, event)
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/internal/:path*',
    '/api/debug/:path*',
    '/api/users/:path*',
  ],
}
