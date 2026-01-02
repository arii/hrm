// File: tests/playwright/lib/visual.ts
/**
 * Visual Regression Testing Utilities
 *
 * This module provides helper functions and default configurations for
 * conducting visual regression tests with Playwright. It aims to reduce
 * boilerplate and ensure consistency across visual tests.
 */

import { expect, type Page, type Locator } from '@playwright/test'
import { getHrMasks, getTimerMasks, waitForFontsLoaded } from '.'

/**
 * Default options for `toHaveScreenshot` to ensure consistency.
 *
 * @property {boolean} fullPage - Capture the entire page.
 * @property {string} animations - Disable all CSS animations and transitions.
 * @property {string} caret - Hide text input caret.
 * @property {number} threshold - Tolerance for color and anti-aliasing differences.
 * @property {number} maxDiffPixelRatio - Allowed ratio of differing pixels.
 */
export const SCREENSHOT_OPTIONS = {
  fullPage: true,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  threshold: 0.2,
  maxDiffPixelRatio: 0.02,
}

/**
 * Takes a screenshot of a page or locator with a standardized set of options.
 *
 * @param target - The page or locator to take a screenshot of.
 * @param snapshotName - The name of the snapshot file (e.g., 'dashboard.png').
 * @param options - Optional custom Playwright screenshot options to override defaults.
 */
export async function takeScreenshot(
  target: Page | Locator,
  snapshotName: string,
  options: object = {}
) {
  await expect(target).toHaveScreenshot(snapshotName, {
    ...SCREENSHOT_OPTIONS,
    ...options,
  })
}

/**
 * Takes a screenshot of the dashboard with common dynamic elements masked.
 *
 * @param page - The dashboard Page object.
 * @param snapshotName - The name of the snapshot file.
 * @param options - Optional custom screenshot options.
 */
export async function takeDashboardScreenshot(
  page: Page,
  snapshotName: string,
  options: object = {}
) {
  await takeScreenshot(page, snapshotName, {
    ...options,
    mask: [
      ...getTimerMasks(page),
      ...getHrMasks(page),
      page.getByTestId('calorie-count'),
      page.locator('.MUI-Charts-root'),
    ],
    maxDiffPixelRatio: 0.08, // Higher tolerance for font rendering in CI
  })
}

/**
 * Prepares a page for visual regression testing by waiting for fonts to load.
 * This helps prevent flaky tests caused by font rendering shifts.
 *
 * @param page - The Playwright Page object to prepare.
 */
export async function prepareForVisualRegression(page: Page): Promise<void> {
  await waitForFontsLoaded(page)
}
