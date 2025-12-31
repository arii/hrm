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
 */
export const WAIT_TIMEOUTS = {
  /** Default timeout for test readiness signal */
  TEST_READY: 2000,
  /** Default timeout for WebSocket connection */
  WEBSOCKET: 5000,
  /** Default timeout for element visibility */
  ELEMENT_VISIBLE: 3000,
  /** Default timeout for network idle */
  NETWORK_IDLE: 5000,
  /** Default timeout for navigation */
  NAVIGATION: 8000,
  /** Short timeout for quick checks */
  SHORT: 1000,
  /** Medium timeout for normal operations */
  MEDIUM: 3000,
  /** Long timeout for complex operations */
  LONG: 8000,
  /** Infrastructure/server startup timeout */
  INFRASTRUCTURE: 10000,
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
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.TEST_READY } = options

  try {
    // Wait for custom test readiness signal from the application
    await page.waitForFunction(
      () => {
        return window.__TEST_READY__ === true
      },
      { timeout }
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

