// File: middleware.ts
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
    // Iterate from right to left to find the first non-private IP
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i]
      // This is a basic check for private IPs.
      // A more robust solution would use a library like `is-ip`.
      if (
        !ip.startsWith('10.') &&
        !ip.startsWith('192.168.') &&
        !/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
      ) {
        return ip
      }
    }
  }
  return request.ip ?? '127.0.0.1'
}

// A global Redis instance and a map of limiters to avoid re-creating them on every request.
let redis: Redis | null = null
let limiters: Map<string, Ratelimit> | null = null

/**
 * Initializes the Redis client and rate limiters.
 * This function is called only when the required environment variables are present.
 */
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

  // The order of insertion matters. More specific paths should come first.
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
      '/api/', // This is a catch-all and must be last.
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

export async function middleware(request: NextRequest) {
  // During tests, rate limiting is skipped.
  if (process.env.TESTING === 'true') {
    return NextResponse.next()
  }

  const limiters = getRateLimiters()

  // If Redis is not configured, skip rate limiting.
  if (!limiters) {
    console.warn(
      'Rate limiting is disabled because Upstash Redis is not configured.'
    )
    return NextResponse.next()
  }

  try {
    const ip = getClientIp(request)
    const { pathname } = request.nextUrl

    // Find the most specific limiter for the current path
    const limiterEntry = Array.from(limiters.entries()).find(([path]) =>
      pathname.startsWith(path)
    )

    if (!limiterEntry) {
      return NextResponse.next()
    }

    const limiter = limiterEntry[1]
    const { success } = await limiter.limit(ip)

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests, please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  } catch (error) {
    console.error('Error in rate limiting middleware:', error)
    // If rate limiting fails, allow the request to proceed to avoid blocking users.
  }

  return NextResponse.next()
}

// Apply the middleware to all API routes
export const config = {
  matcher: '/api/:path*',
}
