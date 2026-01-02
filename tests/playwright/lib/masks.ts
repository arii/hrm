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
export const VRT_MASK_SELECTORS = {
  liveHrValue: '[data-testid="live-hr-value"]',
  liveHrPercent: '[data-testid="live-hr-percent"]',
  hrTileGridItem: '[data-testid="hr-tile-grid-item"]',
  timerCountdown: '[data-testid="timer-countdown"]',
  timerPhaseLabel: '[data-testid="timer-phase-label"]',
} as const

/**
 * @deprecated Use `VRT_MASK_SELECTORS` instead.
 */
export const MASK_SELECTORS = VRT_MASK_SELECTORS

/**
 * Returns an array of locators for all known dynamic elements on the page.
 * This is a comprehensive function to mask all content that changes frequently.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators to be used in the `mask` option of `toHaveScreenshot`.
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
 * Returns an array of locators specifically for heart rate (HR) related elements.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators for HR elements to be masked.
 */
export function getHrMasks(page: Page): Locator[] {
  return [
    page.locator(VRT_MASK_SELECTORS.liveHrValue),
    page.locator(VRT_MASK_SELECTORS.liveHrPercent),
    page.locator(VRT_MASK_SELECTORS.hrTileGridItem),
  ]
}

/**
 * Returns an array of locators specifically for timer-related elements.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators for timer elements to be masked.
 */
export function getTimerMasks(page: Page): Locator[] {
  return [
    page.locator(VRT_MASK_SELECTORS.timerCountdown),
    page.locator(VRT_MASK_SELECTORS.timerPhaseLabel),
  ]
}
