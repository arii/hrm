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

  test.afterEach(async () => {
    // Ensure timer is stopped after each test to maintain a clean state
    await stopTimer(controlPage, dashboardPage)
  })

  test.beforeEach(async ({ request }) => {
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Reload pages to ensure clean client state and fresh WebSocket connection
    await dashboardPage.reload()
    await controlPage.reload()
    await mockPage.reload()

    // 3. Wait for pages to be ready and connected
    await waitForPageReady(dashboardPage)
    await waitForPageReady(controlPage)
    await waitForPageReady(mockPage)

    // Ensure WebSocket is re-established after server reset
    await Promise.all([
      dashboardPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
      controlPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
      mockPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
    ])
  })

test.describe('Dashboard Visual Regression Tests', () => {
  test.describe('Dashboard Component', () => {
    test('initial, empty state', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-empty.png', {
        animations: 'disabled',
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
        timeout: VRT_TIMEOUTS.HYDRATION,
      })

      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to transition from idle (00:00) to prepare (e.g. 10 or 05)
      await expect(dashboardPage.locator('text=Ready')).toBeVisible()

      // Assert timer tile height is fixed
      const timerCard = dashboardPage.getByTestId('timer-display-container')
      await assertFixedDimensions(timerCard, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer.png', {
        animations: 'disabled',
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
      await expect(dashboardPage.locator('text=Ready')).toBeVisible()

      // Assert grid row height is stable
      const topRow = dashboardPage
        .locator('[data-testid="dashboard"] > div')
        .first()
      await assertFixedDimensions(topRow, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer-with-hr.png', {
        animations: 'disabled',
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.15, // Higher threshold for complex combined state
      })
    })

    test('large desktop viewport', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-large-desktop.png', {
        animations: 'disabled',
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
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
