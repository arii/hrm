// File: tests/playwright/lib/waits.ts
/**
 * Specialized Wait Utilities for Playwright Tests
 *
 * This module provides deterministic waiting strategies for stable test execution:
 * - Network and DOM idle synchronization
 * - Custom test readiness signals
 * - WebSocket connection verification
 * - Font loading guarantees
 */
import type { Page, Response as PlaywrightResponse } from '@playwright/test'

/**
 * Default timeout values for wait operations (in milliseconds)
 * All values are kept at or under 3 seconds to prevent slow tests
 */
export const WAIT_TIMEOUTS = {
  /** Default timeout for test readiness signal */
  TEST_READY: 2000,
  /** Default timeout for WebSocket connection */
  WEBSOCKET: 3000,
  /** Default timeout for element visibility */
  ELEMENT_VISIBLE: 3000,
  /** Default timeout for network idle */
  NETWORK_IDLE: 3000,
  /** Default timeout for navigation */
  NAVIGATION: 3000,
  /** Short timeout for quick checks */
  SHORT: 1000,
  /** Short duration timeout */
  SHORT_DURATION: 1000,
  /** Medium timeout for normal operations */
  MEDIUM: 2000,
  /** Medium duration timeout */
  MEDIUM_DURATION: 2000,
  /** Long timeout for complex operations */
  LONG: 3000,
  /** Long duration timeout */
  LONG_DURATION: 3000,
  /** Infrastructure/server startup timeout */
  INFRASTRUCTURE: 3000,
  /** Infrastructure long timeout for build operations */
  INFRASTRUCTURE_LONG: 3000,
} as const

/**
 * Wait for page to be in a stable state for testing.
 * Ensures network activity and DOM updates have ceased.
 *
 * @param page - The Playwright Page object
 * @param options - Optional configuration for wait behavior
 */
export async function waitForPageReady(
  page: Page,
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.TEST_READY } = options

  // Wait for network idle to ensure all async operations complete
  await page.waitForLoadState('networkidle')

  try {
    // Wait for custom test readiness signal from the application
    await page.waitForFunction(
      () => {
        return window.__TEST_READY__ === true
      },
      { timeout },
    )
  } catch {
    // Fallback: If custom signal fails, wait for a known stable element
    console.warn('__TEST_READY__ signal not found, proceeding with UI check')
    await page
      .waitForSelector('main, [role="main"], body > div', {
        state: 'visible',
        timeout: WAIT_TIMEOUTS.ELEMENT_VISIBLE,
      })
      .catch(() => {
        console.warn('No main element found, continuing anyway')
      })
  }
}

/**
 * Wait for WebSocket connection to be established.
 * Useful for tests that depend on real-time data.
 *
 * @param page - The Playwright Page object
 * @param options - Optional configuration for wait behavior
 */
export async function waitForWebSocketConnection(
  page: Page,
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.WEBSOCKET } = options

  await page.waitForFunction(
    () => {
      return window.__TEST_WEBSOCKET_READY__ === true
    },
    { timeout },
  )
}

/**
 * Wait for all fonts to be fully loaded before taking snapshots.
 * This eliminates font-related layout shifts in visual regression tests.
 *
 * @param page - The Playwright Page object
 */
export async function waitForFontsLoaded(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

/**
 * Wait for a specific element to be visible and stable.
 * Useful for ensuring UI components have fully rendered.
 *
 * @param page - The Playwright Page object
 * @param selector - CSS selector for the target element
 * @param options - Optional configuration for wait behavior
 */
export async function waitForElementStable(
  page: Page,
  selector: string,
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.ELEMENT_VISIBLE } = options

  await page.waitForSelector(selector, {
    state: 'visible',
    timeout,
  })

  // Wait for any animations to complete
  await page.waitForFunction(
    (sel: string) => {
      const element = document.querySelector(sel)
      if (!element) return false

      // Check if element has any ongoing CSS animations
      const computedStyle = getComputedStyle(element)
      const animationName = computedStyle.animationName
      const transitionDuration = computedStyle.transitionDuration

      // If no animations or transitions, consider stable
      if (
        (animationName === 'none' || animationName === '') &&
        (transitionDuration === '0s' || transitionDuration === '')
      ) {
        return true
      }

      // If animations exist, wait for them to complete
      return false
    },
    selector,
    { timeout },
  ).catch(() => {
    // If timeout, assume stable enough for testing
    console.warn(`Element ${selector} may still be animating`)
  })
}

/**
 * Wait for network to be idle with a custom timeout.
 * Use when you need more control over network idle detection.
 *
 * @param page - The Playwright Page object
 * @param options - Optional configuration for wait behavior
 */
export async function waitForNetworkIdle(
  page: Page,
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.NETWORK_IDLE } = options

  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Wait for a specific API response to complete.
 * Useful for waiting on specific data loading operations.
 *
 * @param page - The Playwright Page object
 * @param urlPattern - URL pattern to match (string or RegExp)
 * @param options - Optional configuration for wait behavior
 * @returns The response object
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {},
): Promise<PlaywrightResponse | null> {
  const { timeout = WAIT_TIMEOUTS.NETWORK_IDLE } = options

  const response = await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout },
  )

  return response
}

/**
 * Wait for multiple conditions to be satisfied simultaneously.
 * Useful for complex UI states that require multiple elements to be ready.
 *
 * @param page - The Playwright Page object
 * @param conditions - Array of wait functions to execute in parallel
 */
export async function waitForAllConditions(
  page: Page,
  conditions: Array<() => Promise<void>>,
): Promise<void> {
  await Promise.all(conditions.map((condition) => condition()))
}
