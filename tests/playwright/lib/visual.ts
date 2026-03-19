// File: tests/playwright/lib/visual.ts
/**
 * Visual Regression Testing Utilities
 *
 * This module provides helper functions and default configurations for
 * conducting visual regression tests with Playwright. It aims to reduce
 * boilerplate and ensure consistency across visual tests.
 */

import {
  expect,
  type Page,
  type Locator,
  type ScreenshotOptions,
} from '@playwright/test'
import { checkAccessibility } from './accessibility'
import { getHrMasks, getTimerMasks } from '.'

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
  maxDiffPixelRatio: 0.1,
}

/**
 * Waits for the page to be ready for visual regression testing.
 *
 * Minimum contract:
 * 1. Awaits fonts readiness.
 * 2. Awaits network idle.
 * 3. Forces layout reflow to ensure geometry is stable.
 *
 * @param page - The Playwright Page object to prepare.
 */
export async function waitForVRTReady(page: Page): Promise<void> {
  await page.evaluateHandle(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.body.offsetHeight)
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
  options: ScreenshotOptions & { skipA11y?: boolean } = {}
) {
  const { skipA11y = false, ...screenshotOptions } = options

  // Duck-typing to detect a Locator: `Locator` is imported as `type` only, so
  // `instanceof` is unavailable at runtime. This property exists on Locator but not Page.
  const isLocator = 'scrollIntoViewIfNeeded' in target

  // Only scroll to top for full-page (non-locator) targets.
  // MUI popovers/menus rendered in portals can detach if the page is scrolled.
  if (!isLocator) {
    await (target as Page).evaluate(() => window.scrollTo(0, 0))
  }

  if (!skipA11y) {
    await checkAccessibility(target)
  }

  // For Locator targets, poll until scrollHeight stabilizes across two consecutive reads.
  // This ensures CSS Grid/Flexbox reflows (e.g. after setViewportSize) are fully settled
  // before the snapshot is taken. A simple one-shot evaluate would capture the unsettled
  // height immediately, since JS evaluates arguments before the function runs.
  if (isLocator) {
    const locator = target as Locator
    let previousHeight: number | null = null
    await expect
      .poll(
        async () => {
          const currentHeight = await locator.evaluate(
            (node: Element) => node.scrollHeight
          )
          const isStable =
            previousHeight !== null &&
            currentHeight === previousHeight &&
            currentHeight > 0
          previousHeight = currentHeight
          return isStable
        },
        {
          message: 'Waiting for locator height to stabilize',
          timeout: 3000,
          intervals: [100, 250, 500],
        }
      )
      .toBeTruthy()
  }

  const finalOptions = {
    scale: 'css', // Prevent high-DPI (Retina) scaling mismatches in CI
    ...SCREENSHOT_OPTIONS,
    ...screenshotOptions,
  }

  // Remove fullPage option if the target is a Locator, as it's only valid for Page screenshots.
  if (isLocator && finalOptions.fullPage) {
    delete finalOptions.fullPage
  }

  await expect(target).toHaveScreenshot(snapshotName, finalOptions)
}

/**
 * Assert that a component maintains fixed dimensions within a tolerance range.
 * Use this to prevent layout regressions where components grow unexpectedly.
 */
export async function assertFixedDimensions(
  locator: Locator,
  constraints: {
    minHeight?: number
    maxHeight?: number
    minWidth?: number
    maxWidth?: number
  }
) {
  // Wait for the element to be visible before checking its dimensions
  await locator.waitFor({ state: 'visible', timeout: 5000 })
  const bbox = await locator.boundingBox()

  if (!bbox) {
    throw new Error(`Element not found or not visible: ${locator}`)
  }

  if (constraints.minHeight !== undefined) {
    expect(bbox.height).toBeGreaterThanOrEqual(constraints.minHeight)
  }
  if (constraints.maxHeight !== undefined) {
    expect(bbox.height).toBeLessThanOrEqual(constraints.maxHeight)
  }
  if (constraints.minWidth !== undefined) {
    expect(bbox.width).toBeGreaterThanOrEqual(constraints.minWidth)
  }
  if (constraints.maxWidth !== undefined) {
    expect(bbox.width).toBeLessThanOrEqual(constraints.maxWidth)
  }
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
  options: ScreenshotOptions & { skipA11y?: boolean } = {}
) {
  const mainContentLocator = page.getByTestId('main-content-layout')
  const timerDisplayLocator = page.getByTestId('timer-display-container')
  const spotifyAuthLocator = page.getByTestId('spotify-auth-container')
  const spotifyDisplayLocator = page.getByTestId('spotify-display-container')

  // Wait for the main layout and timer to be visible
  await mainContentLocator.waitFor({ state: 'visible' })
  await timerDisplayLocator.waitFor({ state: 'visible' })

  // Wait for either the Spotify login button OR the playback controls to be visible
  await Promise.race([
    spotifyAuthLocator.waitFor({ state: 'visible' }),
    spotifyDisplayLocator.waitFor({ state: 'visible' }),
  ])

  // As a final stabilization step, wait for network idle with a short timeout.
  // This helps catch any final rendering/data loading without failing on persistent connections.
  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 })
  } catch {
    // Ignore timeout errors, as the primary element waits have already passed.
  }

  const clippingRegion = await mainContentLocator.boundingBox()
  let clipOption: ScreenshotOptions['clip'] = options.clip // Preserve existing clip option if any

  if (clippingRegion) {
    clipOption = clippingRegion
  } else {
    console.warn(
      `Warning: Main content layout element not found or visible for clipping in ${snapshotName}. Taking full page screenshot without specific clipping.`
    )
  }

  await takeScreenshot(page, snapshotName, {
    ...options,
    clip: clipOption, // Apply the determined clip region
    mask: [
      ...getTimerMasks(page),
      ...getHrMasks(page),
      page.getByTestId('calorie-count'),
      page.getByTestId('google-doc-viewer-iframe'),
      page.getByTestId('workout-table-header'),
      page.locator('.MUI-Charts-root'),
      page.locator('.variable-text-container'),
    ],
    maxDiffPixelRatio: 0.1,
  })
}

/**
 * Prepares a page for visual regression testing by waiting for fonts to load.
 * This helps prevent flaky tests caused by font rendering shifts.
 *
 * @param page - The Playwright Page object to prepare.
 */
export async function prepareForVisualRegression(page: Page): Promise<void> {
  await waitForVRTReady(page)
}
