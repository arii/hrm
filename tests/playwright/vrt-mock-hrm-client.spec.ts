// tests/playwright/vrt-mock-hrm-client.spec.ts
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  resetServerState,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite for VRT
test.describe('Visual Regression Tests - MockHRM Client', () => {
  test.afterEach(async ({ page }) => {
    // Reset server state after each test
    await resetServerState(page)
  })

  test.describe('MockHRM Client', () => {
    test('form inputs', async ({ mockPage }) => {
      await setupMinimalVisualRegressionTest(mockPage, '/client/mock')
      await mockPage.getByLabel('Weight (kg)').fill('75')
      await mockPage.getByLabel('Height (cm)').fill('180')
      await mockPage.getByLabel('Gender').fill('female')
      const mockClientForm = mockPage.getByTestId('mock-client-form')
      await takeScreenshot(mockClientForm, 'mock-hrm-client-form.png')
    })
  })
})
