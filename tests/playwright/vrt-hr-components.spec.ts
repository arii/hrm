import { expect, type BrowserContext, type Page } from '@playwright/test'
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
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test.beforeEach(async () => {
    await waitForPageReady(dashboardPage)
  })

  test.describe('HR-Related Components', () => {
    test('dashboard with HR data', async () => {
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()

      const dashboard = dashboardPage.getByTestId('dashboard')

      // NEW: Verify HR tile has fixed height before screenshot
      const hrTile = dashboardPage.getByTestId('hr-tile-card').first()
      await hrTile.waitFor({ state: 'visible', timeout: 5000 })
      const boundingBox = await hrTile.boundingBox()

      // Assert tile height is within expected range (allow some variance)
      expect(boundingBox?.height).toBeGreaterThanOrEqual(180)
      expect(boundingBox?.height).toBeLessThanOrEqual(250)

      await takeScreenshot(dashboard, 'dashboard-with-hr-data.png', {
        maxDiffPixelRatio: 0.04,
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })
  })
})
