import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  setupVisualRegressionTest,
  HRM_ROUTES,
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
    await dashboardPage.goto(HRM_ROUTES.VIEWER)
    await waitForPageReady(dashboardPage)
  })

  test.describe('Dashboard Component', () => {
    test('initial, empty state', async () => {
      await takeScreenshot(dashboardPage, 'dashboard-empty.png', {
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })

    test('with active heart rate tiles', async () => {
      // Setup mock heart rate data
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()

      // Wait for the tile to appear
      await dashboardPage
        .getByTestId('hr-tile-card')
        .first()
        .waitFor({ state: 'visible' })

      await takeScreenshot(dashboardPage, 'dashboard-with-hr-tiles.png', {
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })
  })
})
