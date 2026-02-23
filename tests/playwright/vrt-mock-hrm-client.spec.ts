import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest, resetServerState } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let mockPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    mockPage = setup.mockPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test.beforeEach(async ({ request }) => {
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Reload page to ensure clean state
    await mockPage.reload()

    // 3. Wait for page ready
    await waitForPageReady(mockPage)

    // Ensure WebSocket is re-established after server reset
    await mockPage.waitForFunction(
      () => document.body.dataset.connectionStatus === 'connected',
      { timeout: 5000 }
    )
  })

  test.describe('MockHRM Client', () => {
    test('form inputs', async () => {
      await mockPage.getByLabel('Weight (kg)').fill('75')
      await mockPage.getByLabel('Height (cm)').fill('180')
      await mockPage.getByLabel('Gender').fill('female')
      const mockClientForm = mockPage.getByTestId('mock-client-form')
      await takeScreenshot(mockClientForm, 'mock-hrm-client-form.png')
    })
  })
})
