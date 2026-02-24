import { expect } from '@playwright/test'
import { test } from './fixtures'
import { getDynamicContentMasks, resetServerState } from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'
<<<<<<< HEAD
<<<<<<< HEAD
import { stopTimer } from './lib/setup'
=======
>>>>>>> 05de7c3e (test(medium): fix: enhance VRT teardown and cleanup global state (#9249))
import { MOBILE_VIEWPORT, TABLET_VIEWPORT } from './lib/viewports'
=======
>>>>>>> 869dda23 (chore: centralize and automate VRT mock HR device cleanup)

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ dashboardPage, controlPage, mockPage, request }) => {
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Navigate to required routes
    await dashboardPage.goto('/')
    await controlPage.goto('/client/control')
    await mockPage.goto('/client/mock')

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

    // Force visibility to avoid flaky screenshots due to animations
    await dashboardPage.addStyleTag({
      content: `[data-testid="main-content-layout"] { opacity: 1 !important; transform: none !important; }`,
    })
  })

  test.describe('Dashboard Component', () => {
    test('initial, empty state', async ({ dashboardPage }) => {
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
        maxHeight: 400,
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
        maxHeight: 400,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer-with-hr.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.15, // Higher threshold for complex combined state
      })
    })

    // NEW: Responsive breakpoint tests
<<<<<<< HEAD
<<<<<<< HEAD
    test('mobile viewport', async () => {
=======
    test('mobile viewport', async ({ dashboardPage }) => {
>>>>>>> 05de7c3e (test(medium): fix: enhance VRT teardown and cleanup global state (#9249))
      await dashboardPage.setViewportSize(MOBILE_VIEWPORT)
=======
    test('mobile viewport', async ({ dashboardPage }) => {
      await dashboardPage.setViewportSize({ width: 375, height: 1000 })
>>>>>>> c8cb2a02 (chore: optimize VRT cleanup and standardize on fixtures)
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-mobile.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.3, // Higher tolerance for responsive shifts in CI
      })
    })

<<<<<<< HEAD
<<<<<<< HEAD
    test('tablet viewport', async () => {
=======
    test('tablet viewport', async ({ dashboardPage }) => {
>>>>>>> 05de7c3e (test(medium): fix: enhance VRT teardown and cleanup global state (#9249))
      await dashboardPage.setViewportSize(TABLET_VIEWPORT)
=======
    test('tablet viewport', async ({ dashboardPage }) => {
      await dashboardPage.setViewportSize({ width: 768, height: 1000 })
>>>>>>> c8cb2a02 (chore: optimize VRT cleanup and standardize on fixtures)
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-tablet.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.3,
      })
    })

    test('large desktop viewport', async ({ dashboardPage }) => {
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-large-desktop.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })
  })
})
