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
 * Default screenshot options for consistent visual regression testing.
 */
const DEFAULT_SCREENSHOT_OPTIONS = {
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
