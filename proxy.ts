// File: proxy.ts
/**
 * Middleware to handle reverse proxy headers for NextAuth.js.
 *
 * Why is this needed?
 * When the application is deployed behind a reverse proxy (like Nginx or a load balancer),
 * the original protocol (HTTPS) and host are often replaced by the proxy's internal network details.
 * NextAuth.js, which runs on the server, would then see 'http' as the protocol and 'localhost'
 * as the host, which is incorrect. This can cause issues with cookie security (secure flag) and
 * OAuth redirect URLs.
 *
 * What this does:
 * This middleware inspects the `x-forwarded-host`, `x-forwarded-proto`, and `x-forwarded-port` headers,
 * which are standard headers added by reverse proxies to preserve the original request information.
 * It then sets these headers on the response, ensuring that NextAuth.js and other parts of the
 * application correctly identify the original client request details.
 *
 * This is particularly important for:
 * - Ensuring secure cookies (`__Secure-` prefix) are set correctly over HTTPS.
 * - Generating correct absolute URLs for OAuth callbacks and other redirects.
 *
 * This middleware is configured to run only on NextAuth.js API routes (`/api/auth/:path*`)
 * to avoid unnecessary processing on other requests.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
