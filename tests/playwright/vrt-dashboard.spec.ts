// tests/playwright/vrt-dashboard.spec.ts
import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupMinimalVisualRegressionTest,
  resetServerState,
} from './test-helpers'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'

// Test suite for VRT
test.describe('Visual Regression Tests - Dashboard', () => {
  test.afterEach(async ({ page }) => {
    // Reset server state after each test to ensure no leakage (timer, HR data)
    await resetServerState(page)
  })

  test.describe('Dashboard Component', () => {
    test('initial, empty state', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await takeScreenshot(dashboardPage, 'dashboard-empty.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('active timer without HR data', async ({
      dashboardPage,
      controlPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(controlPage, '/client/control')

      // Ensure dashboard is ready
      const timerContainer = dashboardPage.getByTestId(
        'timer-display-container'
      )
      await timerContainer.waitFor({ state: 'visible', timeout: 10000 })

      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to transition from idle (00:00) to prepare
      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: 10000,
        }
      )

      // Assert timer tile height is fixed
      const timerCard = dashboardPage.getByTestId('timer-display-container')
      await assertFixedDimensions(timerCard, {
        maxHeight: 300,
      })

      await takeScreenshot(dashboardPage, 'dashboard-active-timer.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.1,
      })
    })

    test('active timer with HR data', async ({
      dashboardPage,
      controlPage,
      mockPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(controlPage, '/client/control')
      await setupMinimalVisualRegressionTest(mockPage, '/client/mock')

      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to start on dashboard
      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: 10000,
        }
      )

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
          maxDiffPixelRatio: 0.15,
        }
      )
    })

    test('mobile viewport', async ({ dashboardPage }) => {
      // Use exact viewport from expected snapshots to minimize diffs
      await dashboardPage.setViewportSize({ width: 383, height: 1071 })
      await setupMinimalVisualRegressionTest(dashboardPage, '/')

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-mobile.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('tablet viewport', async ({ dashboardPage }) => {
      await dashboardPage.setViewportSize({ width: 768, height: 1166 })
      await setupMinimalVisualRegressionTest(dashboardPage, '/')

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-tablet.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('large desktop viewport', async ({ dashboardPage }) => {
      await dashboardPage.setViewportSize({ width: 2560, height: 1494 })
      await setupMinimalVisualRegressionTest(dashboardPage, '/')

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-large-desktop.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })
  })
})
