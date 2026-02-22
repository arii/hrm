import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Base path for auth routes
const API_AUTH_BASE = '/api/auth/'

// The main middleware function
export default withAuth(
  function middleware(req: NextRequest) {
    const url = req.nextUrl.clone()

    // 1. Handle proxy logic for auth routes
    if (url.pathname.startsWith(API_AUTH_BASE)) {
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

    // 2. Handle original middleware logic (SpotifyAuthFailed check)
    if (url.searchParams.get('error') === 'SpotifyAuthFailed') {
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/internal/:path*',
    '/api/debug/:path*',
    '/api/users/:path*',
  ],
}
