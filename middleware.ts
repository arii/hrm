// File: middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Define rate limiters for different routes
const limiters = new Map<string, Ratelimit>([
  [
    '/api/auth/',
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:/api/auth',
    }),
  ],
  [
    '/api/spotify/',
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'ratelimit:/api/spotify',
    }),
  ],
  [
    '/api/internal/',
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      prefix: 'ratelimit:/api/internal',
    }),
  ],
  [
    '/api/',
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, '60 s'),
      prefix: 'ratelimit:/api',
    }),
  ],
])

export async function middleware(request: NextRequest) {
  // Skip rate limiting if Redis is not configured or during tests
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    process.env.TESTING === 'true'
  ) {
    return NextResponse.next()
  }

  const ip = request.ip ?? '127.0.0.1'
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

  return NextResponse.next()
}

// Apply the middleware to all API routes
export const config = {
  matcher: '/api/:path*',
}
