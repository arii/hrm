import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from '@/tests/playwright/fixtures'
import {
  getDynamicContentMasks,
  setupVisualRegressionTest,
} from '@/tests/playwright/test-helpers'
import {
  takeScreenshot,
  assertFixedDimensions,
} from '@/tests/playwright/lib/visual'
import { waitForPageReady } from '@/tests/playwright/lib/waits'
import { stopTimer } from '@/tests/playwright/lib/setup'

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

  test.afterEach(async () => {
    // Ensure timer is stopped after each test to maintain a clean state
    await stopTimer(controlPage, dashboardPage)
  })

  test.beforeEach(async () => {
    await waitForPageReady(dashboardPage)
    await waitForPageReady(controlPage)
    await waitForPageReady(mockPage)

    // Force visibility to avoid flaky screenshots due to animations
    await dashboardPage.addStyleTag({
      content: `[data-testid="main-content-layout"] { opacity: 1 !important; transform: none !important; }`,
    })
  })

  test.describe('Dashboard Component', () => {
    test('initial, empty state', async () => {
      await takeScreenshot(dashboardPage, 'dashboard-empty.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    // NEW: Active timer with no HR data
    test('active timer without HR data', async () => {
      // Ensure dashboard is ready
      const timerContainer = dashboardPage.getByTestId(
        'timer-display-container'
      )
      await timerContainer.waitFor({ state: 'visible', timeout: 10000 })

      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to transition from idle (00:00) to prepare (e.g. 10 or 05)
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

    // NEW: Active timer WITH HR data (the regression scenario)
    test('active timer with HR data', async () => {
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
          maxDiffPixelRatio: 0.15, // Higher threshold for complex combined state
        }
      )
    })

    // NEW: Responsive breakpoint tests
    test('mobile viewport', async () => {
      await dashboardPage.setViewportSize({ width: 375, height: 812 })
      await takeScreenshot(dashboardPage, 'dashboard-mobile.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('tablet viewport', async () => {
      await dashboardPage.setViewportSize({ width: 768, height: 1024 })
      await takeScreenshot(dashboardPage, 'dashboard-tablet.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('large desktop viewport', async () => {
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })
      await takeScreenshot(dashboardPage, 'dashboard-large-desktop.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })
  })
})
