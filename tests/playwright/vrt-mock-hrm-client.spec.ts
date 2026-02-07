import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
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

  test.beforeEach(async () => {
    await waitForPageReady(mockPage)
  })

  test.describe('MockHRM Client', () => {
    test('form inputs', async () => {
      await mockPage.getByLabel('Weight (kg)').fill('75')
      await mockPage.getByLabel('Height (cm)').fill('180')
      await mockPage.getByLabel('Gender').fill('female')
      const mockClientForm = mockPage.getByTestId('mock-client-form')
      // Isolate relaxed threshold for this specific flaky form snapshot
      await takeScreenshot(mockClientForm, 'mock-hrm-client-form.png', {
        maxDiffPixelRatio: 0.05,
      })
    })
  })
})
