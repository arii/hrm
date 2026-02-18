import { type BrowserContext, type Page } from '@playwright/test'
import { test, expect } from './fixtures'
import {
  getDynamicContentMasks,
  setupVisualRegressionTest,
} from './test-helpers'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let controlPage: Page
let mockPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
    controlPage = setup.controlPage
    mockPage = setup.mockPage
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

    // NEW: Active timer with no HR data
    test('active timer without HR data', async () => {
      await controlPage.getByTestId('start-timer-button').click()
      await expect(dashboardPage.getByTestId('timer-countdown')).toBeVisible()

      // Assert timer tile height is fixed
      const timerCard = dashboardPage.getByTestId('timer-display-container')
      await assertFixedDimensions(timerCard, {
        maxHeight: 300,
      })

      await takeScreenshot(dashboardPage, 'dashboard-active-timer.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
      })
    })

    // NEW: Active timer WITH HR data (the regression scenario)
    test('active timer with HR data', async () => {
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await controlPage.getByTestId('start-timer-button').click()

      // Assert grid row height is stable
      const topRow = dashboardPage
        .locator('[data-testid="dashboard"] > div')
        .first()
      await assertFixedDimensions(topRow, {
        maxHeight: 350,
      })

      await takeScreenshot(
        dashboardPage,
        'dashboard-active-timer-with-hr.png',
        {
          mask: [...getDynamicContentMasks(dashboardPage)],
        }
      )
    })

    // NEW: Responsive breakpoint tests
    test('mobile viewport', async () => {
      await dashboardPage.setViewportSize({ width: 375, height: 812 })
      await takeScreenshot(dashboardPage, 'dashboard-mobile.png', {
        mask: getDynamicContentMasks(dashboardPage),
      })
    })

    test('tablet viewport', async () => {
      await dashboardPage.setViewportSize({ width: 768, height: 1024 })
      await takeScreenshot(dashboardPage, 'dashboard-tablet.png', {
        mask: getDynamicContentMasks(dashboardPage),
      })
    })

    test('large desktop viewport', async () => {
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })
      await takeScreenshot(dashboardPage, 'dashboard-large-desktop.png', {
        mask: getDynamicContentMasks(dashboardPage),
      })
    })
  })
})
