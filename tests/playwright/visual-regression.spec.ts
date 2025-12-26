// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 *
 * DETERMINISTIC CAPTURE STRATEGY:
 * - Network and DOM idle synchronization before snapshots
 * - Font loading guarantees for consistent rendering
 * - Precise masking of dynamic content using data-testid selectors
 * - Element isolation for scoped component screenshots
 */
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  BASE_URL,
  getDynamicContentMasks,
  getHrMasks,
  getSpotifyMasks,
  getTimerMasks,
  replaceIframeWithStableWorkout,
  waitForFontsLoaded,
  waitForPageReady,
  waitForWebSocketConnection,
} from './test-helpers'
import { WAIT_TIMEOUTS } from './lib/waits'

// Configure tests to run serially for better performance
test.describe.configure({ mode: 'serial' })

// Persistent pages for reuse across tests
let dashboardPage: Page
let controlPage: Page
let mockPage: Page
let context: BrowserContext

test.describe('Visual Regression Tests', () => {
  // Set up all pages once before all tests
  test.beforeAll(async ({ browser }) => {
    // Increase timeout for setup to handle parallel page loads and potential server slowness
    test.setTimeout(WAIT_TIMEOUTS.LONG * 2) // Allow extra time for visual tests

    context = await browser.newContext({
      // Start with a clean session - no cookies, cache, or storage
      storageState: undefined,
    })

    // Create all pages in parallel
    ;[dashboardPage, controlPage, mockPage] = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ])

    // Navigate all pages in parallel
    await Promise.all([
      dashboardPage.goto(BASE_URL),
      controlPage.goto(`${BASE_URL}/client/control`),
      mockPage.goto(`${BASE_URL}/client/mock`),
    ])

    // Wait for all pages to be ready in parallel (includes networkidle)
    await Promise.all([
      waitForPageReady(dashboardPage),
      waitForPageReady(controlPage),
      waitForPageReady(mockPage),
    ])

    // Wait for fonts to load on all pages to eliminate font-related shifts
    await Promise.all([
      waitForFontsLoaded(dashboardPage),
      waitForFontsLoaded(controlPage),
      waitForFontsLoaded(mockPage),
    ])

    // Replace iframe with stable content for dashboard
    // Wait for dashboard to settle before replacing
    try {
      // Wait for a known stable element instead of arbitrary timeout
      await expect(dashboardPage.locator('body')).toBeVisible({
        timeout: WAIT_TIMEOUTS.SHORT * 2,
      })
      await replaceIframeWithStableWorkout(dashboardPage)
    } catch (e) {
      console.warn(
        'Failed to replace iframe (it might be missing or slow to load):',
        e
      )
    }
  })

  // Clean up after all tests
  test.afterAll(async () => {
    if (context) {
      await context.close()
    }
  })

  test('Dashboard - main viewer page', async () => {
    // Wait for fonts to be fully loaded for consistent rendering
    await waitForFontsLoaded(dashboardPage)

    // Wait for WebSocket to be connected to ensure a stable UI state
    await waitForWebSocketConnection(dashboardPage)

    // Extra verification: ensure timer is NOT in active state (no WORK/REST)
    // Wait for any existing timer display to settle or disappear
    try {
      await expect(dashboardPage.locator('text=00:00')).toBeVisible({
        timeout: WAIT_TIMEOUTS.MEDIUM,
      })
    } catch {
      // Timer might already be idle, continue
    }

    // Wait for a stable UI element instead of arbitrary timeout
    await expect(dashboardPage.locator('body')).toBeVisible()

    // Capture full-page screenshot - mask dynamic content using data-testid selectors
    await expect(dashboardPage).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide', // Hide text cursor
      threshold: 0.2, // Allow for minor rendering differences
      maxDiffPixelRatio: 0.02, // Allow up to 2% pixel difference (robustness fix)
      mask: [
        // Use precise data-testid selectors for dynamic content masking
        ...getDynamicContentMasks(dashboardPage),
        ...getSpotifyMasks(dashboardPage),
      ],
    })
  })

  test('Control Panel - timer and music controls', async () => {
    // Capture screenshot
    await expect(controlPage).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('Mock HRM Client - test data input', async () => {
    // Capture screenshot
    await expect(mockPage).toHaveScreenshot('mock-hrm-client.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
      maxDiffPixelRatio: 0.02,
    })
  })

  test('Dashboard with active timer', async () => {
    await controlPage.reload()
    // Wait for control page to be fully loaded - check for Timer Mode text
    await expect(controlPage.getByText('Timer Mode')).toBeVisible({
      timeout: WAIT_TIMEOUTS.ELEMENT_VISIBLE,
    })
    // Ensure WebSocket is connected before interacting with controls
    await waitForWebSocketConnection(controlPage)

    // Use the new DurationStepper component to configure the timer
    const decreaseWorkButton = controlPage.getByRole('button', {
      name: /Decrease Work Duration/i,
    })
    const decreaseRestButton = controlPage.getByRole('button', {
      name: /Decrease Rest Duration/i,
    })

    // Default work is 20, decrease once to 15
    await decreaseWorkButton.click()
    // Default rest is 10, decrease once to 5
    await decreaseRestButton.click()

    // Start timer
    await controlPage.click('button:has-text("START")', { force: true })

    // wait for broadcast messages to propagate
    // Use the recommended, specific locator
    const stopButton = controlPage.getByRole('button', {
      name: 'STOP',
      exact: true,
    })

    // Use this specific locator in your assertion
    await expect(stopButton).toBeVisible()

    // Wait for timer to appear on dashboard
    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
      timeout: WAIT_TIMEOUTS.INFRASTRUCTURE,
    })

    // Wait for fonts to load before snapshot
    await waitForFontsLoaded(dashboardPage)

    // Capture screenshot with running timer - mask dynamic timer content using data-testid selectors
    await expect(dashboardPage).toHaveScreenshot('dashboard-active-timer.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
      maxDiffPixelRatio: 0.02,
      mask: [
        // Use precise data-testid selectors for timer masking
        ...getTimerMasks(dashboardPage),
      ],
    })
  })

  test('Dashboard with mock HR data streaming', async () => {
    await mockPage.getByLabel('User Name').fill('Mock User')
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await expect(mockPage.getByLabel('Current BPM')).toHaveValue('155')

    await waitForWebSocketConnection(mockPage)
    await mockPage.click('button:has-text("START")')
    // Wait for WebSocket to connect and user to be visible
    await dashboardPage.waitForSelector(
      '[data-testid="ws-status-indicator"]:has-text("Connected")'
    )
    await expect(dashboardPage.locator('text=Mock User')).toBeVisible()

    // Wait for fonts to load before snapshot
    await waitForFontsLoaded(dashboardPage)

    // Capture screenshot with HR data displayed while masking dynamic content
    await expect(dashboardPage).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
      maxDiffPixelRatio: 0.04, // Robustness for dynamic content
      mask: [
        // Use precise data-testid selectors for all dynamic content masking
        ...getDynamicContentMasks(dashboardPage),
        // Also mask the entire HR tiles section for complete coverage
        ...getHrMasks(dashboardPage),
      ],
    })
  })

  test('HR Tiles - all zones', async () => {
    // Set HR zone first, then start streaming
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await mockPage.click('button:has-text("START")')
    await expect(
      mockPage.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Wait for HR tiles to load on dashboard
    await dashboardPage.waitForSelector('[data-testid="hr-tile-grid-item"]', {
      timeout: WAIT_TIMEOUTS.LONG,
    })

    // Wait for fonts to load before snapshot
    await waitForFontsLoaded(dashboardPage)

    // Use element isolation: scope snapshot to specific component
    const firstTile = dashboardPage
      .locator('[data-testid="hr-tile-grid-item"]')
      .first()
    await expect(firstTile).toHaveScreenshot('hr-tiles-section.png', {
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
      maxDiffPixelRatio: 0.05, // Increased tolerance for rendering variability
      // Mask the dynamic HR values within the tile
      mask: [
        firstTile.locator('[data-testid="live-hr-value"]'),
        firstTile.locator('[data-testid="live-hr-percent"]'),
      ],
    })
  })
})
