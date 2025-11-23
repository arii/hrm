// File: middleware.ts (NextAuth Reverse Proxy Middleware)
/**
 * Middleware to handle reverse proxy headers for NextAuth.js
 * This ensures that HTTPS cookies work properly behind a reverse proxy.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only handle auth routes
  if (!request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  
  // Handle reverse proxy headers for NextAuth
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  
  if (forwardedHost && forwardedProto) {
    // Set the correct host and protocol for NextAuth
    response.headers.set('x-forwarded-host', forwardedHost)
    response.headers.set('x-forwarded-proto', forwardedProto)
    
    // Ensure NextAuth recognizes HTTPS
    if (forwardedProto === 'https') {
      response.headers.set('x-forwarded-ssl', 'on')
    }
  }
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Auth request:', {
      pathname: request.nextUrl.pathname,
      host: request.headers.get('host'),
      forwardedHost,
      forwardedProto
    })
  }
  
  return response
}

export const config = {
  matcher: [
    '/api/auth/:path*'
  ]
}