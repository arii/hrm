import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  setupVisualRegressionTest,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let mockPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
    mockPage = setup.mockPage

    // Inject flag to disable animations for stable VRT
    await dashboardPage.addInitScript(() => {
      window.__IS_TEST_ENV__ = true
    })
    await dashboardPage.reload()
    await mockPage.reload()
    await waitForPageReady(dashboardPage)
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test.beforeEach(async () => {
    // Ensure both pages are ready before each test to prevent race conditions
    await Promise.all([
      waitForPageReady(dashboardPage),
      waitForPageReady(mockPage),
    ])
  })

  test.describe('HR-Related Components', () => {
    test('dashboard with HR data', async () => {
      test.setTimeout(60000) // Increase timeout for CI stability
      await mockPage.getByTestId('hr-input').fill('155', { timeout: 30000 })
      await mockPage.getByTestId('zone-4-button').click({ timeout: 30000 })

      const dashboard = dashboardPage.getByTestId('dashboard')

      await takeScreenshot(dashboard, 'dashboard-with-hr-data.png', {
        maxDiffPixelRatio: 0.04,
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })

    test('heart rate zone distribution chart', async () => {
      test.setTimeout(60000) // Increase timeout for CI stability
      // Ensure we are in the active workout view
      const newWorkoutBtn = dashboardPage.getByRole('button', {
        name: 'New Workout',
      })
      if (await newWorkoutBtn.isVisible()) {
        await newWorkoutBtn.click()
      }

      const startWorkoutBtn = dashboardPage.getByRole('button', {
        name: 'Start Workout',
      })
      if (await startWorkoutBtn.isVisible()) {
        await startWorkoutBtn.click()
      }

      // Inject data via mock page to populate zones
      // Peak zone
      await mockPage.getByTestId('hr-input').fill('155', { timeout: 30000 })
      await mockPage.getByTestId('zone-4-button').click({ timeout: 30000 })

      // Ensure mock client is connected before starting stream
      await expect(
        mockPage.locator('text=Server Status: Connected')
      ).toBeVisible({ timeout: 10000 })

      await mockPage.getByTestId('streaming-start-button').click()

      // Wait for data to be processed and chart to render
      // We need to wait for at least one interval (1s) plus some buffer
      await dashboardPage.waitForSelector(
        '[data-testid="zone-distribution-card"]'
      )

      const zoneCard = dashboardPage.getByTestId('zone-distribution-card')

      await takeScreenshot(zoneCard, 'hr-zone-distribution-chart.png', {
        maxDiffPixelRatio: 0.02,
      })
    })
  })
})
