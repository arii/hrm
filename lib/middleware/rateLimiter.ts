import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '../env'

let redis: Redis
let ratelimit: (requests: number, window: `${string} s`) => Ratelimit

// Conditionally initialize Redis and Ratelimit based on env vars
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })

  ratelimit = (requests: number, window: `${string} s`) =>
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
    })
} else {
  // Provide a mock implementation for test environments
  // This allows tests to run without needing Upstash credentials.
  console.warn(
    'Upstash Redis credentials not found. Rate limiting will be disabled.'
  )
  const mockRatelimit = {
    limit: () => ({
      success: true,
      limit: 5000,
      remaining: 4999,
      reset: Date.now() + 1000,
    }),
  }
  ratelimit = () => mockRatelimit as unknown as Ratelimit
}

export const spotifyApiLimiter = ratelimit(
  env.RATE_LIMIT_SPOTIFY_MAX,
  `${env.RATE_LIMIT_SPOTIFY_WINDOW_MINUTES * 60} s`
)
export const internalApiLimiter = ratelimit(
  env.RATE_LIMIT_INTERNAL_MAX,
  `${env.RATE_LIMIT_INTERNAL_WINDOW_MINUTES * 60} s`
)
export const generalApiLimiter = ratelimit(
  env.RATE_LIMIT_GENERAL_MAX,
  `${env.RATE_LIMIT_GENERAL_WINDOW_MINUTES * 60} s`
)
export const authApiLimiter = ratelimit(
  env.RATE_LIMIT_AUTH_MAX,
  `${env.RATE_LIMIT_AUTH_WINDOW_MINUTES * 60} s`
)
