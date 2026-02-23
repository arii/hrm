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
<<<<<<< HEAD
<<<<<<< HEAD
  bpmPercent: '[data-testid="bpm-percent"]',
  bpmValue: '[data-testid="bpm-value"]',
  caloriesValue: '[data-testid="calories-value"]',
=======
  liveHrValue: '[data-testid="bpm-value"]',
=======
  liveHrValue: '[data-testid="live-hr-value"]',
>>>>>>> 8586293e (feat(vrt): implement spotify api mocking and stabilize visual regression tests)
  liveHrPercent: '[data-testid="live-hr-percent"]',
  hrTileGridItem: '[data-testid="hr-tile-grid-item"]',
>>>>>>> 0dc4e7b1 (feat: implement Spotify API mocking and improve VRT suite stability)
  timerCountdown: '[data-testid="timer-countdown"]',
  timerPhaseLabel: '[data-testid="timer-phase-label"]',
  hrTimeSeriesChart: '[data-testid="hr-time-series-chart"]',
} as const

/**
 * Returns an array of locators for all known dynamic elements on the page.
 * This is a comprehensive function to mask all content that changes frequently.
 *
 * @param page - The Playwright Page object.
 * @returns An array of Locators to be used in the `mask` option of `toHaveScreenshot`.
 */
export function getDynamicContentMasks(page: Page): Locator[] {
  return [
<<<<<<< HEAD
    page.locator(VRT_MASK_SELECTORS.bpmPercent),
    page.locator(VRT_MASK_SELECTORS.bpmValue),
    page.locator(VRT_MASK_SELECTORS.caloriesValue),
=======
    page.locator(VRT_MASK_SELECTORS.liveHrValue),
    page.locator(VRT_MASK_SELECTORS.liveHrPercent),
<<<<<<< HEAD
    page.locator(VRT_MASK_SELECTORS.liveHrCalories),
    page.locator(VRT_MASK_SELECTORS.liveHrName),
>>>>>>> 0dc4e7b1 (feat: implement Spotify API mocking and improve VRT suite stability)
=======
>>>>>>> 8586293e (feat(vrt): implement spotify api mocking and stabilize visual regression tests)
    page.locator(VRT_MASK_SELECTORS.timerCountdown),
    page.locator(VRT_MASK_SELECTORS.timerPhaseLabel),
    page.locator(VRT_MASK_SELECTORS.hrTimeSeriesChart),
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
<<<<<<< HEAD
    page.locator(VRT_MASK_SELECTORS.bpmPercent),
    page.locator(VRT_MASK_SELECTORS.bpmValue),
    page.locator(VRT_MASK_SELECTORS.caloriesValue),
=======
    page.locator(VRT_MASK_SELECTORS.liveHrValue),
    page.locator(VRT_MASK_SELECTORS.liveHrPercent),
    page.locator(VRT_MASK_SELECTORS.hrTileGridItem),
>>>>>>> 0dc4e7b1 (feat: implement Spotify API mocking and improve VRT suite stability)
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
