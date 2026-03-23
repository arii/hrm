import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupMinimalVisualRegressionTest,
  HRM_ROUTES,
  MOBILE_VIEWPORT,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { VRT_TIMEOUTS } from './lib/timeouts'

// Test suite for VRT
test.describe('Dashboard Visual Regression Tests', () => {
  test.describe('Dashboard Component', () => {
    test('initial, empty state', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-empty.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    // NEW: Active timer with no HR data
    test('active timer without HR data', async ({
      dashboardPage,
      controlPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)

      // Ensure dashboard is ready
      const timerContainer = dashboardPage.getByTestId(
        'timer-display-container'
      )
      await timerContainer.waitFor({
        state: 'visible',
        timeout: VRT_TIMEOUTS.STANDARD,
      })

      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to transition from idle (00:00) to prepare (e.g. 10 or 05)
      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      // Assert timer tile height is fixed
      const timerCard = dashboardPage.getByTestId('timer-display-container')
      await assertFixedDimensions(timerCard, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.1,
      })
    })

    // NEW: Active timer WITH HR data (the regression scenario)
    test('active timer with HR data', async ({
      dashboardPage,
      controlPage,
      mockPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
      await setupMinimalVisualRegressionTest(mockPage, HRM_ROUTES.MOCK)

      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to start on dashboard
      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      // Assert grid row height is stable
      const topRow = dashboardPage
        .locator('[data-testid="dashboard"] > div')
        .first()
      await assertFixedDimensions(topRow, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer-with-hr.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.1,
      })
    })

    test('large desktop viewport', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-large-desktop.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.15,
      })
    })

    test('mobile viewport', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await dashboardPage.setViewportSize(MOBILE_VIEWPORT)
      await dashboardPage.evaluate(() => window.scrollTo(0, 0))
      const dashboard = dashboardPage.getByTestId('dashboard')

      // Await layout engine reflow
      await dashboardPage.waitForFunction(
        (width) => document.body.clientWidth === width,
        MOBILE_VIEWPORT.width
      )

      const box = await dashboard.boundingBox()
      await takeScreenshot(dashboard, 'dashboard-mobile.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.05,
        // Force expected height to prevent overflow mismatches
        clip: box ? { ...box, height: 1038 } : undefined,
      })
    })
  })
})
