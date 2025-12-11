import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '../env'

// Create a new Redis client
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

// Create a new rate limiter
const ratelimit = (requests: number, window: `${number} s`) =>
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
  })

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
