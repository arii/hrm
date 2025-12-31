// File: tests/playwright/lib/auth.ts
/**
 * Authentication Flow Utilities for Playwright Tests
 *
 * This module provides utilities for testing authentication flows:
 * - Spotify OAuth flow simulation
 * - Session management
 * - Authentication state verification
 */
import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { getBaseURL } from '../../../utils/urls'
import { WAIT_TIMEOUTS } from './waits'

/**
 * Authentication endpoints used in testing
 */
export const AUTH_ENDPOINTS = {
  /** Debug auth check endpoint */
  AUTH_CHECK: '/api/debug/auth-check',
  /** Debug session endpoint */
  SESSION: '/api/debug/session',
  /** Debug ping endpoint */
  PING: '/api/debug/ping',
  /** Spotify token status endpoint */
  SPOTIFY_TOKEN_STATUS: '/api/debug/spotify-token-status',
} as const

