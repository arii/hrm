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

/**
 * Verify that authentication endpoints are properly configured.
 *
 * @param page - The Playwright Page object
 * @returns Object containing authentication configuration status
 */
export async function verifyAuthConfiguration(page: Page): Promise<{
  spotifyConfigured: boolean
  nextAuthConfigured: boolean
  hasClientSecret: boolean
}> {
  const baseUrl = getBaseURL()
  const response = await page.request.get(
    `${baseUrl}${AUTH_ENDPOINTS.AUTH_CHECK}`
  )

  expect(response.ok()).toBe(true)
  const data = await response.json()

  return {
    spotifyConfigured: data.spotifyConfigured ?? false,
    nextAuthConfigured: data.nextAuthConfigured ?? false,
    hasClientSecret: data.hasClientSecret ?? false,
  }
}

/**
 * Verify that the debug endpoints are responding.
 *
 * @param page - The Playwright Page object
 * @returns Object containing endpoint status
 */
export async function verifyDebugEndpoints(page: Page): Promise<{
  pingOk: boolean
  sessionOk: boolean
}> {
  const baseUrl = getBaseURL()

  // Check ping endpoint
  const pingResponse = await page.request.get(
    `${baseUrl}${AUTH_ENDPOINTS.PING}`
  )
  const pingJson = await pingResponse.json()

  // Check session endpoint
  const sessionResponse = await page.request.get(
    `${baseUrl}${AUTH_ENDPOINTS.SESSION}`
  )

  return {
    pingOk: pingResponse.ok() && pingJson.ok === true,
    sessionOk: sessionResponse.status() < 500,
  }
}

/**
 * Wait for authentication redirect to complete.
 * Useful when testing OAuth flows.
 *
 * @param page - The Playwright Page object
 * @param options - Optional configuration
 */
export async function waitForAuthRedirect(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.NAVIGATION } = options
  const baseUrl = getBaseURL()

  // Wait for redirect back to the application
  await page.waitForURL(`${baseUrl}/**`, {
    timeout,
    waitUntil: 'networkidle',
  })
}

/**
 * Check if user is currently logged in by looking for login indicators.
 *
 * @param page - The Playwright Page object
 * @returns Boolean indicating login status
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for login button (indicates NOT logged in)
  const loginButton = page.getByText('🎵 Login with Spotify')
  const isLoginButtonVisible = await loginButton
    .isVisible({ timeout: 3000 })
    .catch(() => false)

  return !isLoginButtonVisible
}

/**
 * Verify that the OAuth state cookie error is NOT present.
 * This captures a specific regression to avoid.
 *
 * @param page - The Playwright Page object
 */
export async function verifyNoStateCookieError(page: Page): Promise<void> {
  const errorText = await page
    .getByText(/State cookie was missing/i)
    .isVisible()
  expect(
    errorText,
    '❌ Critical: "State cookie was missing" error detected!'
  ).toBe(false)
}

/**
 * Verify Spotify token status via debug endpoint.
 *
 * @param page - The Playwright Page object
 * @returns Token status information
 */
export async function verifySpotifyTokenStatus(page: Page): Promise<{
  status: string
  hasAccessToken: boolean
  hasRefreshToken: boolean
}> {
  const baseUrl = getBaseURL()
  const response = await page.request.get(
    `${baseUrl}${AUTH_ENDPOINTS.SPOTIFY_TOKEN_STATUS}`
  )

  expect(response.status()).toBe(200)
  const data = await response.json()

  return {
    status: data.status ?? 'unknown',
    hasAccessToken: !!data.accessToken,
    hasRefreshToken: !!data.refreshToken,
  }
}

/**
 * Create an authenticated browser context with stored credentials.
 * Useful for tests that require pre-authenticated state.
 *
 * Note: This function provides a foundation for custom auth state management.
 * For production use, implement storage state handling with context.storageState().
 *
 * @param context - The Playwright BrowserContext object
 * @param _storageState - Reserved for future storage state path parameter
 * @returns The configured context (passthrough for now)
 * @example
 * ```typescript
 * // Save authenticated state
 * await context.storageState({ path: 'auth.json' })
 *
 * // Create context with saved state
 * const context = await browser.newContext({ storageState: 'auth.json' })
 * ```
 */
export async function createAuthenticatedContext(
  context: BrowserContext,
  _storageState?: string
): Promise<BrowserContext> {
  // Returns context as-is - implement storage state handling as needed
  return context
}

/**
 * Navigate to a protected route and handle authentication if needed.
 *
 * @param page - The Playwright Page object
 * @param route - The protected route to navigate to
 * @param options - Optional configuration
 */
export async function navigateToProtectedRoute(
  page: Page,
  route: string,
  options: { expectAuth?: boolean; timeout?: number } = {}
): Promise<void> {
  const { expectAuth = false, timeout = 30000 } = options
  const baseUrl = getBaseURL()

  await page.goto(`${baseUrl}${route}`)

  if (expectAuth) {
    // Check if we were redirected to login
    const loginButton = page.getByText('🎵 Login with Spotify')
    const isLoginButtonVisible = await loginButton
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    if (isLoginButtonVisible) {
      console.log('ℹ️  Login button found. Auth required for this route.')
    }
  }

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout })
}
