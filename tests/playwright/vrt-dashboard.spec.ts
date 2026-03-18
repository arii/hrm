import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupVisualRegressionTest,
  resetServerState,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'
import { stopTimer } from './lib/setup'
import { MOBILE_VIEWPORT, TABLET_VIEWPORT } from './lib/viewports'

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
    // 1. Intercept Spotify SDK to prevent 401s and initialization errors
    await dashboardPage.route(
      'https://sdk.scdn.co/spotify-player.js',
      (route) => route.abort()
    )

    // 2. Mock Internal Auth API for VRT
    await dashboardPage.route('**/api/spotify/access-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock_token',
          expiresAt: Date.now() + 3600000,
        }),
      })
    })

    // 3. Reset server-side state
    await resetServerState(request)

    // 4. Reload pages to ensure clean client state and fresh WebSocket connection
    await dashboardPage.reload()
    await controlPage.reload()
    await mockPage.reload()

    // 5. Navigate and trigger user interaction to unlock AudioContext
    await dashboardPage.mouse.click(0, 0)

    // 6. Wait for pages to be ready and connected
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
    const getVrtOptions = (page: Page) => ({
      mask: [
        ...getDynamicContentMasks(page),
        page.locator('.variable-text-container'),
      ],
      fullPage: false,
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
        maxHeight: 400,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.1,
      })
    })

    test('active timer with HR data', async () => {
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await controlPage.getByTestId('start-timer-button').click()

      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      await expect(
        dashboardPage.getByTestId('hr-tile-card').first()
      ).toBeVisible()

      const topRow = dashboardPage
        .locator('[data-testid="dashboard"] > div')
        .first()
      await assertFixedDimensions(topRow, {
        maxHeight: 800,
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

    test('mobile viewport', async () => {
      await dashboardPage.setViewportSize(MOBILE_VIEWPORT)
      await dashboardPage.evaluate(() => window.scrollTo(0, 0))
      const dashboard = dashboardPage.getByTestId('dashboard')

      await dashboardPage.waitForFunction(
        (width) => document.body.clientWidth === width,
        MOBILE_VIEWPORT.width
      )

      await takeScreenshot(dashboard, 'dashboard-mobile.png', getVrtOptions(dashboardPage))
    })

    test('tablet viewport', async () => {
      await dashboardPage.setViewportSize(TABLET_VIEWPORT)

      const dashboard = dashboardPage.getByTestId('dashboard')

      await takeScreenshot(dashboard, 'dashboard-tablet.png', {
        ...getVrtOptions(dashboardPage),
        maxDiffPixelRatio: 0.05,
      })
    })

    test('large desktop viewport', async () => {
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })

      const dashboard = dashboardPage.getByTestId('dashboard')

      await takeScreenshot(dashboard, 'dashboard-large-desktop.png', {
        ...getVrtOptions(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })
  })
})
