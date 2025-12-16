// File: proxy.ts (Next.js Middleware for Rate Limiting and Reverse Proxy)
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Extracts the real client IP address from the request.
 * It parses the `x-forwarded-for` header, iterating from right to left
 * to find the first public IP address. Falls back to `request.ip`.
 * @param request The NextRequest object.
 * @returns The client's IP address.
 */
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const ips = xff.split(',').map((ip) => ip.trim())
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i]
      if (
        ip &&
        !ip.startsWith('10.') &&
        !ip.startsWith('192.168.') &&
        !/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
      ) {
        return ip
      }
    }
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}

let redis: Redis | null = null
let limiters: Map<string, Ratelimit> | null = null

function getRateLimiters() {
  if (redis && limiters) {
    return limiters
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  redis = new Redis({ url, token })

  limiters = new Map<string, Ratelimit>([
    [
      '/api/auth/',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          parseInt(process.env.RATELIMIT_AUTH_LIMIT || '20'),
          `${parseInt(process.env.RATELIMIT_AUTH_WINDOW_SECONDS || '60')} s`
        ),
        prefix: 'ratelimit:/api/auth',
      }),
    ],
    [
      '/api/spotify/',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          parseInt(process.env.RATELIMIT_SPOTIFY_LIMIT || '30'),
          `${parseInt(process.env.RATELIMIT_SPOTIFY_WINDOW_SECONDS || '60')} s`
        ),
        prefix: 'ratelimit:/api/spotify',
      }),
    ],
    [
      '/api/internal/',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          parseInt(process.env.RATELIMIT_INTERNAL_LIMIT || '100'),
          `${parseInt(process.env.RATELIMIT_INTERNAL_WINDOW_SECONDS || '60')} s`
        ),
        prefix: 'ratelimit:/api/internal',
      }),
    ],
    [
      '/api/',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          parseInt(process.env.RATELIMIT_GENERAL_LIMIT || '200'),
          `${parseInt(process.env.RATELIMIT_GENERAL_WINDOW_SECONDS || '60')} s`
        ),
        prefix: 'ratelimit:/api',
      }),
    ],
  ])

  return limiters
}

export async function proxy(request: NextRequest) {
  // --- Rate Limiting ---
  if (process.env.TESTING !== 'true') {
    const limiters = getRateLimiters()
    if (limiters) {
      try {
        const ip = getClientIp(request)
        const { pathname } = request.nextUrl
        const limiterEntry = Array.from(limiters.entries()).find(([path]) =>
          pathname.startsWith(path)
        )
        if (limiterEntry) {
          const limiter = limiterEntry[1]
          const { success } = await limiter.limit(ip)
          if (!success) {
            return new NextResponse(
              JSON.stringify({
                error: 'Too many requests, please try again later.',
              }),
              {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        }
      } catch (error) {
        console.error('Error in rate limiting middleware:', error)
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error(
        'CRITICAL: Rate limiting is disabled in production due to missing Upstash Redis configuration.'
      )
      return new NextResponse(
        'Rate limiting system misconfigured. Please check server logs.',
        { status: 500 }
      )
    }
  }

  // --- Reverse Proxy Header Handling for NextAuth ---
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    const response = NextResponse.next()
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const forwardedPort = request.headers.get('x-forwarded-port')
    const host = request.headers.get('host')

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
}

export const config = {
  matcher: ['/api/:path*'],
}
