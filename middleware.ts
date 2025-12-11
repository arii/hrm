import { NextRequest, NextResponse } from 'next/server'
import {
  authApiLimiter,
  generalApiLimiter,
  internalApiLimiter,
  spotifyApiLimiter,
} from './lib/middleware/rateLimiter'
import { getToken } from 'next-auth/jwt'
import logger from './utils/logger'

// Base path for auth routes
const API_AUTH_BASE = '/api/auth/'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const response = NextResponse.next()

  // Apply rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    let limiter
    if (pathname.startsWith('/api/auth/')) {
      limiter = authApiLimiter
    } else if (pathname.startsWith('/api/spotify/')) {
      limiter = spotifyApiLimiter
    } else if (pathname.startsWith('/api/internal/')) {
      limiter = internalApiLimiter
    } else {
      limiter = generalApiLimiter
    }

    const token = await getToken({ req })
    const identifier =
      token?.sub ||
      (req.headers.get('x-forwarded-for') as string)?.split(',')[0] ||
      '127.0.0.1'
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())

    if (!success) {
      logger.warn({ identifier, pathname }, 'Rate limit exceeded')
      return new NextResponse('Too many requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      })
    }
  }

  // Preserve the original NextAuth reverse proxy logic
  if (pathname.startsWith(API_AUTH_BASE)) {
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

  return response
}

export const config = {
  matcher: '/api/:path*',
}
