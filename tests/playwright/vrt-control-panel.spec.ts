import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest, resetServerState } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let controlPage: Page
let dashboardPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    controlPage = setup.controlPage
    dashboardPage = setup.dashboardPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  // Add a beforeEach hook to wait for the page to be ready before each test
  test.beforeEach(async ({ request }) => {
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Reload pages to ensure clean client state and fresh WebSocket connection
    await controlPage.reload()
    await dashboardPage.reload()

    // 3. Wait for pages to be ready and connected
    await waitForPageReady(controlPage)
    await waitForPageReady(dashboardPage)

    // Ensure WebSocket is re-established after server reset
    await Promise.all([
      controlPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
      dashboardPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
    ])
  })

  test.describe('ControlPanel Component', () => {
    test('initial state', async () => {
      const controlPanel = controlPage.getByTestId('control-panel')
      await takeScreenshot(controlPanel, 'control-panel.png')
    })
  })
})
