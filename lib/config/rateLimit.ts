/**
 * @fileoverview Centralized configuration for rate limiting.
 * @description This file exports rate limit settings for various API endpoints,
 * allowing for easy management and consistency. The use of a central configuration
 * simplifies applying different limits based on endpoint sensitivity and expected traffic.
 * It is consumed by the rate limiting middleware in `server.ts`.
 */

import { Options } from 'express-rate-limit'

// Default options for all rate limiters to ensure consistency
const defaultOptions: Partial<Options> = {
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
}

// Rate limiting configurations for specific API endpoints
export const rateLimitConfig = {
  // Stricter limit for endpoints that could be abused for resource exhaustion
  critical: {
    ...defaultOptions,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100,
  },
  // Applied to sensitive but less frequent operations, e.g., creating a workout
  sensitive: {
    ...defaultOptions,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50,
  },
  // General purpose limiter for most API routes
  general: {
    ...defaultOptions,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200,
  },
  // A more lenient limit for Spotify control actions, which can be frequent
  spotifyControl: {
    ...defaultOptions,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
  },
}
