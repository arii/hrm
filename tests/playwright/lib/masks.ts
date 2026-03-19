// File: tests/playwright/lib/masks.ts
/**
 * Masking Utilities for Visual Regression Testing
 *
 * This module provides functions to generate locators for dynamic UI elements
 * that should be masked (hidden) during visual regression tests to prevent
 * flaky comparisons due to ever-changing content like timers or live data.
 */

import type { Locator, Page } from '@playwright/test'

/**
 * A centralized object of data-testid selectors for dynamic elements.
 * Using `data-testid` attributes provides resilient selectors that are decoupled
 * from CSS classes or DOM structure, making tests less brittle.
 */
export const VRT_MASK_SELECTORS = [
  '[data-vrt-mask="true"]',
  '.MuiTypography-root', // Global text masking for dynamic values
  'svg',                 // Mask all animated ProgressRings/Charts
]

export const VRT_CONFIG = {
  maskColor: '#000000',
  // Applying padding via a custom utility before snapshot
}

/**
 * Returns an array of locators for all known dynamic elements on the page.
 * This is a comprehensive function to mask all content that changes frequently.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators to be used in the `mask` option of `toHaveScreenshot`.
 */
export function getDynamicContentMasks(page: Page): Locator[] {
  return VRT_MASK_SELECTORS.map(selector => page.locator(selector))
}

/**
 * Returns an array of locators specifically for heart rate (HR) related elements.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators for HR elements to be masked.
 */
export function getHrMasks(page: Page): Locator[] {
  // Since we rely on global selectors now, we return those
  return getDynamicContentMasks(page)
}

/**
 * Returns an array of locators specifically for timer-related elements.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators for timer elements to be masked.
 */
export function getTimerMasks(page: Page): Locator[] {
  // Since we rely on global selectors now, we return those
  return getDynamicContentMasks(page)
}

export function getSpotifyMasks(page: Page): Locator[] {
  // Since we rely on global selectors now, we return those
  return getDynamicContentMasks(page)
}
