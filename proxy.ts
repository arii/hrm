// File: proxy.ts (NextAuth Reverse Proxy)
/**
 * Proxy to handle reverse proxy headers for NextAuth.js.
 * This ensures that HTTPS cookies work properly behind a reverse proxy.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Base path for auth routes
const API_AUTH_BASE = '/api/auth/'

export function proxy(request: NextRequest) {
  // Only handle auth routes
  if (!request.nextUrl.pathname.startsWith(API_AUTH_BASE)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Handle reverse proxy headers for NextAuth
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedPort = request.headers.get('x-forwarded-port')
  const host = request.headers.get('host')

  // Determine the actual host being accessed
  const actualHost = forwardedHost || host || ''
  const actualProto = forwardedProto || 'https'
  const actualPort = forwardedPort || ''

  // Reconstruct the full URL with port for NextAuth
  if (actualHost) {
    // Ensure Host header includes the port if not already present and port is custom
    let hostWithPort = actualHost
    if (actualPort && !actualHost.includes(':')) {
      // Add port only if it's non-standard (444 for dev, or explicitly forwarded)
      if (actualPort !== '443') {
        hostWithPort = `${actualHost}:${actualPort}`
      }
    }

    response.headers.set('x-forwarded-host', hostWithPort)
    response.headers.set('x-forwarded-proto', actualProto)

    if (actualPort) {
      response.headers.set('x-forwarded-port', actualPort)
    }

    // Ensure NextAuth recognizes HTTPS
    if (actualProto === 'https') {
      response.headers.set('x-forwarded-ssl', 'on')
    }
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Proxy] Auth request:', {
      pathname: request.nextUrl.pathname,
      host: request.headers.get('host'),
      forwardedHost,
      forwardedProto,
      forwardedPort,
    })
  }

  return response
}

export const config = {
  // Note: matcher must be static strings for Next.js static analysis
  matcher: ['/api/auth/:path*'],
}
