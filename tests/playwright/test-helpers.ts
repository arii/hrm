// File: tests/playwright/test-helpers.ts
/**
 * Shared Test Helpers: Reusable functions for consistent test setup
 *
 * This module provides deterministic capture strategies for visual regression tests:
 * - Network and DOM idle synchronization
 * - Font loading guarantees
 * - Masking selectors for dynamic content
 */
import type { BrowserContext, Page } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE_URL = getBaseURL()

/**
 * Wait for page to be in a stable state for visual regression testing.
 * Ensures network activity and DOM updates have ceased.
 */
export const waitForPageReady = async (page: Page) => {
  // Wait for network idle to ensure all async operations complete
  await page.waitForLoadState('networkidle')

  try {
    await page.waitForFunction(
      () => {
        return window.__TEST_READY__ === true
      },
      { timeout: 3000 }
    )
  } catch {
    // Fallback: If custom signal fails, wait for a known stable element instead of sleeping
    console.warn('__TEST_READY__ signal not found, proceeding with UI check')
    // Wait for the main content area to be visible
    await page
      .waitForSelector('main, [role="main"], body > div', {
        state: 'visible',
        timeout: 5000,
      })
      .catch(() => {
        // If no main element found, just continue
        console.warn('No main element found, continuing anyway')
      })
  }
}

/**
 * Wait for all fonts to be fully loaded before taking snapshots.
 * This eliminates font-related layout shifts in visual regression tests.
 */
export const waitForFontsLoaded = async (page: Page) => {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

/**
 * Mask selectors for dynamic content that should be hidden during VRT snapshots.
 * These selectors target elements that contain live/streaming data.
 */
export const VRT_MASK_SELECTORS = {
  // Live heart rate data
  liveHrValue: '[data-testid="live-hr-value"]',
  liveHrPercent: '[data-testid="live-hr-percent"]',
  hrTileGridItem: '[data-testid="hr-tile-grid-item"]',
  // Timer countdown
  timerCountdown: '[data-testid="timer-countdown"]',
  timerPhaseLabel: '[data-testid="timer-phase-label"]',
} as const

/**
 * Get an array of Playwright locators for masking dynamic content in screenshots.
 * @param page The Playwright Page object
 * @returns Array of locators for dynamic elements that should be masked
 */
export const getDynamicContentMasks = (page: Page) => [
  page.locator(VRT_MASK_SELECTORS.liveHrValue),
  page.locator(VRT_MASK_SELECTORS.liveHrPercent),
  page.locator(VRT_MASK_SELECTORS.timerCountdown),
  page.locator(VRT_MASK_SELECTORS.timerPhaseLabel),
]

/**
 * Get an array of Playwright locators for masking HR tile content.
 * @param page The Playwright Page object
 * @returns Array of locators for HR-related dynamic elements
 */
export const getHrMasks = (page: Page) => [
  page.locator(VRT_MASK_SELECTORS.liveHrValue),
  page.locator(VRT_MASK_SELECTORS.liveHrPercent),
  page.locator(VRT_MASK_SELECTORS.hrTileGridItem),
]

/**
 * Get an array of Playwright locators for masking timer content.
 * @param page The Playwright Page object
 * @returns Array of locators for timer-related dynamic elements
 */
export const getTimerMasks = (page: Page) => [
  page.locator(VRT_MASK_SELECTORS.timerCountdown),
  page.locator(VRT_MASK_SELECTORS.timerPhaseLabel),
]

// Helper function to replace iframe with stable workout content
export const replaceIframeWithStableWorkout = async (page: Page) => {
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe')
    if (iframe) {
      iframe.src =
        'data:text/html;charset=utf-8,' +
        encodeURIComponent(`
        <!DOCTYPE html>
        <html><head><style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        h3 { margin: 0 0 10px 0; color: #333; }
        p { margin: 5px 0; font-size: 14px; }
        </style></head><body>
        <p><strong>Sample Workout Plan</strong></p>
        <table><tr>
        <td><h3>30/10 x 3</h3><p>3 way crunch</p><p>Dead bug</p><p>Plank variations</p></td>
        <td><h3>Tabata</h3><p>Band h. Bridge</p><p>Band p. Squat</p><p>Band hydrants</p></td>
        <td><h3>Complex 5x5</h3><p>RDL</p><p>High pull</p><p>1 ½ squat</p></td>
        <td><h3>3x10</h3><p>Alt box ch press</p><p>Single Hip thrust</p></td>
        <td><h3>3 x 12</h3><p>Kb curl</p><p>Tricep planks</p><p>Butterfly bridge</p></td>
        </tr></table>
        <p><a href="#">Previous workouts</a></p>
        </body></html>
      `)
    }
  })

  // Wait for the DOM update with the data:text/html iframe, not a generic iframe timer
  try {
    await page.waitForSelector('iframe[src^="data:text/html"]', { state: 'attached', timeout: 2000 })
  } catch {
    console.warn(
      'Warning: Iframe with data:text/html src not found. Iframe may be missing.'
    )
  }
}

// Setup function for visual regression tests
export const setupVisualRegressionTest = async ({
  dashboardPage,
  controlPage,
  mockPage,
  connectPage,
}: {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}) => {
  // Navigate all pages and wait for ready signals
  await dashboardPage.goto(BASE_URL)
  await controlPage.goto(`${BASE_URL}/phone`)
  await mockPage.goto(`${BASE_URL}/mock`)
  await connectPage.goto(`${BASE_URL}/connect`)

  // Wait for all pages to signal ready
  await Promise.all([
    waitForPageReady(dashboardPage),
    waitForPageReady(controlPage),
    waitForPageReady(mockPage),
    waitForPageReady(connectPage),
  ])

  // Replace iframe with stable content for dashboard
  await replaceIframeWithStableWorkout(dashboardPage)
}

// NEW, more efficient setup function
export const setupMinimalVisualRegressionTest = async (
  page: Page,
  path: string = ''
) => {
  await page.goto(`${BASE_URL}${path}`)
  await waitForPageReady(page)
  if (path === '') {
    await replaceIframeWithStableWorkout(page)
  }
}

// Setup function for comprehensive tests
export const setupComprehensiveTest = async ({
  page,
  context,
}: {
  page: Page
  context: BrowserContext
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })

  // Pre-warm all endpoints for comprehensive tests
  const dashboardTab = await context.newPage()
  const controlTab = await context.newPage()
  const mockTab = await context.newPage()
  const connectTab = await context.newPage()

  await Promise.all([
    dashboardTab.goto(BASE_URL),
    controlTab.goto(`${BASE_URL}/phone`),
    mockTab.goto(`${BASE_URL}/mock`),
    connectTab.goto(`${BASE_URL}/connect`),
  ])

  await Promise.all([
    waitForPageReady(dashboardTab),
    waitForPageReady(controlTab),
    waitForPageReady(mockTab),
    waitForPageReady(connectTab),
  ])

  // Close pre-warm tabs but keep connections alive
  await dashboardTab.close()
  await controlTab.close()
  await mockTab.close()
  await connectTab.close()
}

export async function setupCoreTest({ page }: { page: Page }) {
  await waitForPageReady(page)
  await replaceIframeWithStableWorkout(page)
  await waitForWebSocketConnection(page)
}

export async function waitForWebSocketConnection(page: Page) {
  await page.waitForFunction(
    () => {
      return window.__TEST_WEBSOCKET_READY__ === true
    },
    { timeout: 10000 }
  )
}

export { BASE_URL }
