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

interface WindowWithTestFlags extends Window {
  __TEST_WEBSOCKET_READY__?: boolean
}

import {
  expectPageToHaveScreenshot,
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
} from './lib/assertions'
import {
  BASE_URL,
  setupPageForVisualRegression,
  stopTimer,
  waitForFontsLoaded,
} from './lib'
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
    test.setTimeout(WAIT_TIMEOUTS.LONG * 2)
    context = await browser.newContext({ storageState: undefined })
    ;[dashboardPage, controlPage, mockPage] = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ])

    await Promise.all([
      setupPageForVisualRegression(
        dashboardPage,
        `${BASE_URL}/`,
        true
      ),
      setupPageForVisualRegression(
        controlPage,
        `${BASE_URL}/client/control`
      ),
      setupPageForVisualRegression(
        mockPage,
        `${BASE_URL}/client/mock`
      ),
    ])

    await stopTimer(controlPage, dashboardPage)
  })

  // Clean up after all tests
  test.afterAll(async () => {
    if (context) {
      await context.close()
    }
  })

  test('Dashboard - main viewer page', async () => {
    // 1. Ensure WebSocket hydration is finished
    await dashboardPage.waitForFunction(
      () => (window as WindowWithTestFlags).__TEST_WEBSOCKET_READY__ === true
    )

    // 2. Force a specific idle state to ensure the '00:00' text is stable
    await expect(dashboardPage.getByTestId('timer-countdown')).toHaveText(
      /(\d{2}:\d{2})/,
      {
        timeout: WAIT_TIMEOUTS.MEDIUM,
      }
    )

    await expectPageToHaveScreenshot(
      dashboardPage,
      'dashboard-viewer.png',
      {
        mask: [
          ...getTimerMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
          dashboardPage.getByTestId('calorie-count'),
          dashboardPage.locator('.MUI-Charts-root'),
        ],
        maxDiffPixelRatio: 0.08,
      }
    )
  })

  test('Control Panel - timer and music controls', async () => {
    await expectPageToHaveScreenshot(
      controlPage,
      'control-panel.png'
    )
  })

  test('Mock HRM Client - test data input', async () => {
    await expectPageToHaveScreenshot(
      mockPage,
      'mock-hrm-client.png',
      {
        maxDiffPixelRatio: 0.02,
      }
    )
  })

  test('Dashboard with active timer', async () => {
    // Wait for control page to be fully loaded - check for Timer Mode text
    await expect(controlPage.getByText('Timer Mode')).toBeVisible({
      timeout: WAIT_TIMEOUTS.ELEMENT_VISIBLE,
    })

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

    await expectPageToHaveScreenshot(
      dashboardPage,
      'dashboard-active-timer.png',
      {
        mask: getTimerMasks(dashboardPage),
        maxDiffPixelRatio: 0.02,
      }
    )
  })

  test('Dashboard with mock HR data streaming', async () => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await expect(mockPage.getByLabel('Current BPM')).toHaveValue('155')

    // Dashboard page already loaded via fixture
    await expect(dashboardPage.locator('text=Mock User')).toBeVisible()

    // Wait for fonts to load before snapshot
    await waitForFontsLoaded(dashboardPage)

    await expectPageToHaveScreenshot(
      dashboardPage,
      'dashboard-with-hr-data.png',
      {
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
        maxDiffPixelRatio: 0.04,
      }
    )
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

    const firstTile = dashboardPage
      .locator('[data-testid="hr-tile-grid-item"]')
      .first()

    await expectPageToHaveScreenshot(
      firstTile,
      'hr-tiles-section.png',
      {
        mask: [
          firstTile.locator('[data-testid="live-hr-value"]'),
          firstTile.locator('[data-testid="live-hr-percent"]'),
        ],
        maxDiffPixelRatio: 0.05,
      }
    )
  })
})
