import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupVisualRegressionTest,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test.beforeEach(async () => {
    await waitForPageReady(dashboardPage)
  })

  test.describe('Dashboard Component', () => {
    test('initial, empty state', async () => {
      await takeScreenshot(dashboardPage, 'dashboard-empty.png', {
        mask: getDynamicContentMasks(dashboardPage),
      })
    })
  })
})
