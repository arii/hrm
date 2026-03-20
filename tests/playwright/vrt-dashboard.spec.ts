import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupVisualRegressionTest,
  resetServerState,
  mockLoggedInSession,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'
import { stopTimer } from './lib/setup'

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

  test.beforeEach(async ({ request }) => {
    await dashboardPage.route(
      'https://sdk.scdn.co/spotify-player.js',
      (route) => route.abort()
    )

    await mockLoggedInSession(context)

    await resetServerState(request)

    await dashboardPage.reload()

    await dashboardPage.mouse.click(0, 0)

    await waitForPageReady(dashboardPage)

    await dashboardPage.waitForFunction(
      () => document.body.dataset.connectionStatus === 'connected',
      { timeout: 5000 }
    )

    // Force visibility to avoid flaky screenshots due to animations
    await dashboardPage.addStyleTag({
      content: `[data-testid="main-content-layout"] { opacity: 1 !important; transform: none !important; }`,
    })
  })

  test.describe('Dashboard Component', () => {
    const BASE_VRT_OPTIONS = {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    }

    const getVrtOptions = (page: Page) => ({
      ...BASE_VRT_OPTIONS,
      mask: [
        ...getDynamicContentMasks(page),
        page.locator('.variable-text-container'),
      ],
    })

    test.beforeEach(async () => {
      await dashboardPage.evaluateHandle(() => document.fonts.ready)
    })

    test('initial, empty state', async () => {
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-empty.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('active timer without HR data', async () => {
      const timerContainer = dashboardPage.getByTestId(
        'timer-display-container'
      )
      await timerContainer.waitFor({
        state: 'visible',
        timeout: VRT_TIMEOUTS.STANDARD,
      })

      await controlPage.getByTestId('start-timer-button').click()

      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

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

    test('active timer with HR data', async () => {
      // Reload mockPage and controlPage specifically for this test
      // because they weren't reloaded in the optimized beforeEach hook
      await controlPage.reload()
      await mockPage.reload()
      await waitForPageReady(controlPage)
      await waitForPageReady(mockPage)
      await Promise.all([
        controlPage.waitForFunction(
          () => document.body.dataset.connectionStatus === 'connected',
          { timeout: 5000 }
        ),
        mockPage.waitForFunction(
          () => document.body.dataset.connectionStatus === 'connected',
          { timeout: 5000 }
        ),
      ])

      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await controlPage.getByTestId('start-timer-button').click()

      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      // Ensure data binding worked
      await expect(dashboardPage.getByTestId('bpm-value').first()).toHaveText(
        '155 BPM',
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      const topRow = dashboardPage
        .locator('[data-testid="dashboard"] > div')
        .first()
      await assertFixedDimensions(topRow, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')

      await dashboardPage.setViewportSize({ width: 1920, height: 1080 })

      await takeScreenshot(dashboard, 'dashboard-active-timer-with-hr.png', {
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          dashboardPage.locator('.variable-text-container'),
        ],
      })
    })

    test('large desktop viewport', async () => {
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })

      const dashboard = dashboardPage.getByTestId('dashboard')

      await takeScreenshot(
        dashboard,
        'dashboard-large-desktop.png',
        getVrtOptions(dashboardPage)
      )
    })
  })
})
