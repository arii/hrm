import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
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
  test.beforeEach(async () => {
    await waitForPageReady(controlPage)
  })

  test.describe('ControlPanel Component', () => {
    test('initial state', async () => {
      const controlPanel = controlPage.getByTestId('control-panel')
      await takeScreenshot(controlPanel, 'control-panel.png')
    })
  })
})
