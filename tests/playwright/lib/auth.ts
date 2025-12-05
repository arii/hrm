// File: tests/playwright/lib/auth.ts
/**
 * Authentication Flow Utilities for Playwright Tests
 *
 * This module provides utilities for testing authentication flows:
 * - Spotify OAuth flow simulation
 * - Session management
 * - Authentication state verification
 */
import type { Browser, BrowserContext, Page } from '@playwright/test'
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
 * Creates a browser context with a mocked authentication state.
 * @param browser The Playwright browser instance.
 * @returns A promise that resolves to an authenticated BrowserContext.
 */
export async function createAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()
  const mockSession = {
    accessToken: 'mock-access-token',
    user: {
      name: 'Mock User',
      email: 'mock@example.com',
      image: 'https://via.placeholder.com/150',
    },
    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
  }

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: 'mock-session-token',
      domain: '127.0.0.1',
      path: '/',
    },
  ])

  // Add a route to mock the session API response
  await context.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSession),
    })
  })

  return context
}
/**
 * Verify that authentication endpoints are properly configured.
 *
 * @param page - The Playwright Page object
 * @returns Object containing authentication configuration status
 */
export async function verifyAuthConfiguration(
  page: Page,
): Promise<{
  spotifyConfigured: boolean
  nextAuthConfigured: boolean
  hasClientSecret: boolean
}> {
  const baseUrl = getBaseURL()
  const response = await page.request.get(`${baseUrl}${AUTH_ENDPOINTS.AUTH_CHECK}`)

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
export async function verifyDebugEndpoints(
  page: Page,
): Promise<{
  pingOk: boolean
  sessionOk: boolean
}> {
  const baseUrl = getBaseURL()

  // Check ping endpoint
  const pingResponse = await page.request.get(`${baseUrl}${AUTH_ENDPOINTS.PING}`)
  const pingJson = await pingResponse.json()

  // Check session endpoint
  const sessionResponse = await page.request.get(`${baseUrl}${AUTH_ENDPOINTS.SESSION}`)

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
  options: { timeout?: number } = {},
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
  const isLoginButtonVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false)

  return !isLoginButtonVisible
}

/**
 * Verify that the OAuth state cookie error is NOT present.
 * This captures a specific regression to avoid.
 *
 * @param page - The Playwright Page object
 */
export async function verifyNoStateCookieError(page: Page): Promise<void> {
  const errorText = await page.getByText(/State cookie was missing/i).isVisible()
  expect(errorText, '❌ Critical: "State cookie was missing" error detected!').toBe(false)
}

/**
 * Verify Spotify token status via debug endpoint.
 *
 * @param page - The Playwright Page object
 * @returns Token status information
 */
export async function verifySpotifyTokenStatus(
  page: Page,
): Promise<{
  status: string
  hasAccessToken: boolean
  hasRefreshToken: boolean
}> {
  const baseUrl = getBaseURL()
  const response = await page.request.get(`${baseUrl}${AUTH_ENDPOINTS.SPOTIFY_TOKEN_STATUS}`)

  expect(response.status()).toBe(200)
  const data = await response.json()

  return {
    status: data.status ?? 'unknown',
    hasAccessToken: !!data.accessToken,
    hasRefreshToken: !!data.refreshToken,
  }
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
  options: { expectAuth?: boolean; timeout?: number } = {},
): Promise<void> {
  const { expectAuth = false, timeout = 30000 } = options
  const baseUrl = getBaseURL()

  await page.goto(`${baseUrl}${route}`)

  if (expectAuth) {
    // Check if we were redirected to login
    const loginButton = page.getByText('🎵 Login with Spotify')
    const isLoginButtonVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (isLoginButtonVisible) {
      console.log('ℹ️  Login button found. Auth required for this route.')
    }
  }

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout })
}
