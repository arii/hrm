// File: tests/playwright/lib/assertions.ts
/**
 * Custom Assertion Functions for Domain-Specific Testing
 *
 * This module provides custom assertion functions for HRM-specific testing:
 * - Visual regression assertions with consistent masking
 * - WebSocket connection state assertions
 * - Timer state assertions
 * - HR data assertions
 */
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Mask selectors for dynamic content that should be hidden during VRT snapshots.
 * These selectors target elements that contain live/streaming data.
 */
export const VRT_MASK_SELECTORS = {
  /** Live heart rate value display */
  liveHrValue: '[data-testid="live-hr-value"]',
  /** Live heart rate percentage display */
  liveHrPercent: '[data-testid="live-hr-percent"]',
  /** HR tile grid item container */
  hrTileGridItem: '[data-testid="hr-tile-grid-item"]',
  /** Timer countdown display */
  timerCountdown: '[data-testid="timer-countdown"]',
  /** Timer phase label (WORK/REST) */
  timerPhaseLabel: '[data-testid="timer-phase-label"]',
  spotify: '[data-testid="spotify-display"]',
} as const

/**
 * Get an array of Playwright locators for masking all dynamic content in screenshots.
 *
 * @param page - The Playwright Page object
 * @returns Array of locators for dynamic elements that should be masked
 */
export function getDynamicContentMasks(page: Page): Locator[] {
  return [
    page.locator(VRT_MASK_SELECTORS.liveHrValue),
    page.locator(VRT_MASK_SELECTORS.liveHrPercent),
    page.locator(VRT_MASK_SELECTORS.timerCountdown),
    page.locator(VRT_MASK_SELECTORS.timerPhaseLabel),
  ]
}

/**
 * Get an array of Playwright locators for masking HR tile content.
 *
 * @param page - The Playwright Page object
 * @returns Array of locators for HR-related dynamic elements
 */
export function getHrMasks(page: Page): Locator[] {
  return [
    page.locator(VRT_MASK_SELECTORS.liveHrValue),
    page.locator(VRT_MASK_SELECTORS.liveHrPercent),
    page.locator(VRT_MASK_SELECTORS.hrTileGridItem),
  ]
}

/**
 * Get an array of Playwright locators for masking timer content.
 *
 * @param page - The Playwright Page object
 * @returns Array of locators for timer-related dynamic elements
 */
export function getTimerMasks(page: Page): Locator[] {
  return [
    page.locator(VRT_MASK_SELECTORS.timerCountdown),
    page.locator(VRT_MASK_SELECTORS.timerPhaseLabel),
  ]
}
/**
 * Get an array of Playwright locators for masking timer content.
 *
 * @param page - The Playwright Page object
 * @returns Array of locators for timer-related dynamic elements
 */
export function getSpotifyMasks(page: Page): Locator[] {
  return [page.locator(VRT_MASK_SELECTORS.spotify)]
}

/**
 * Default screenshot options for consistent visual regression testing.
 */
export const DEFAULT_SCREENSHOT_OPTIONS = {
  /** Full page capture */
  fullPage: true,
  /** Disable animations for deterministic snapshots */
  animations: 'disabled' as const,
  /** Hide text cursor */
  caret: 'hide' as const,
  /** Allow for minor rendering differences */
  threshold: 0.2,
  /** Allow up to 2% pixel difference */
  maxDiffPixelRatio: 0.02,
}

/**
 * Assert that a page matches its expected screenshot with standard masking.
 * Uses consistent options for visual regression testing.
 *
 * @param page - The Playwright Page object
 * @param snapshotName - Name of the snapshot file
 * @param options - Optional configuration overrides
 */
export async function assertPageSnapshot(
  page: Page,
  snapshotName: string,
  options: {
    mask?: Locator[]
    threshold?: number
    maxDiffPixelRatio?: number
  } = {}
): Promise<void> {
  const { mask = [], threshold, maxDiffPixelRatio } = options

  await expect(page).toHaveScreenshot(snapshotName, {
    ...DEFAULT_SCREENSHOT_OPTIONS,
    mask,
    ...(threshold !== undefined && { threshold }),
    ...(maxDiffPixelRatio !== undefined && { maxDiffPixelRatio }),
  })
}

/**
 * Assert that a specific element matches its expected screenshot.
 *
 * @param locator - The Playwright Locator for the element
 * @param snapshotName - Name of the snapshot file
 * @param options - Optional configuration overrides
 */
export async function assertElementSnapshot(
  locator: Locator,
  snapshotName: string,
  options: {
    mask?: Locator[]
    threshold?: number
    maxDiffPixelRatio?: number
  } = {}
): Promise<void> {
  const { mask = [], threshold, maxDiffPixelRatio } = options

  await expect(locator).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    caret: 'hide',
    threshold: threshold ?? DEFAULT_SCREENSHOT_OPTIONS.threshold,
    maxDiffPixelRatio:
      maxDiffPixelRatio ?? DEFAULT_SCREENSHOT_OPTIONS.maxDiffPixelRatio,
    mask,
  })
}

/**
 * Assert that a timer is in a specific state (WORK, REST, or IDLE).
 *
 * @param page - The Playwright Page object
 * @param expectedState - Expected timer state
 * @param options - Optional configuration
 */
export async function assertTimerState(
  page: Page,
  expectedState: 'WORK' | 'REST' | 'IDLE',
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options

  if (expectedState === 'IDLE') {
    // Timer should show 00:00 when idle
    await expect(page.locator('text=00:00')).toBeVisible({ timeout })
  } else {
    // Timer should show WORK or REST phase
    await expect(page.locator(`text=${expectedState}`)).toBeVisible({ timeout })
  }
}

/**
 * Assert that a WebSocket connection is established.
 *
 * @param page - The Playwright Page object
 * @param options - Optional configuration
 */
export async function assertWebSocketConnected(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options

  const isConnected = await page.evaluate((t) => {
    return new Promise<boolean>((resolve) => {
      const checkConnection = () => {
        if (window.__TEST_WEBSOCKET_READY__ === true) {
          resolve(true)
          return
        }
        setTimeout(checkConnection, 100)
      }
      checkConnection()
      setTimeout(() => resolve(false), t)
    })
  }, timeout)

  expect(isConnected).toBe(true)
}

/**
 * Assert that HR data is displayed for a specific user.
 *
 * @param page - The Playwright Page object
 * @param userName - Expected user name
 * @param options - Optional configuration
 */
export async function assertHrDataVisible(
  page: Page,
  userName: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options

  await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout })
}

/**
 * Assert that a button is in a specific state (enabled/disabled, visible/hidden).
 *
 * @param page - The Playwright Page object
 * @param buttonName - Button text or label
 * @param expectedState - Expected button state
 * @param options - Optional configuration
 */
export async function assertButtonState(
  page: Page,
  buttonName: string,
  expectedState: { visible?: boolean; enabled?: boolean },
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options
  const button = page.getByRole('button', { name: buttonName, exact: true })

  if (expectedState.visible !== undefined) {
    if (expectedState.visible) {
      await expect(button).toBeVisible({ timeout })
    } else {
      await expect(button).not.toBeVisible({ timeout })
    }
  }

  if (expectedState.enabled !== undefined) {
    if (expectedState.enabled) {
      await expect(button).toBeEnabled({ timeout })
    } else {
      await expect(button).toBeDisabled({ timeout })
    }
  }
}

/**
 * Assert that an API response has the expected status code.
 *
 * @param response - The API response object
 * @param expectedStatus - Expected status code
 */
export function assertApiStatus(
  response: { status: () => number; ok: () => boolean },
  expectedStatus: number | 'ok' | 'not-ok'
): void {
  if (expectedStatus === 'ok') {
    expect(response.ok()).toBe(true)
  } else if (expectedStatus === 'not-ok') {
    expect(response.ok()).toBe(false)
  } else {
    expect(response.status()).toBe(expectedStatus)
  }
}

/**
 * Assert that an API response contains specific properties.
 *
 * @param response - The API response JSON object
 * @param expectedProperties - Object with expected properties and their values
 */
export function assertApiResponse(
  response: Record<string, unknown>,
  expectedProperties: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(expectedProperties)) {
    expect(response).toHaveProperty(key, value)
  }
}
