import { test } from './fixtures'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  test.describe('MockHRM Client', () => {
    test('form inputs', async ({ mockPage }) => {
      await mockPage.goto('/client/mock')
      await waitForPageReady(mockPage)
      await mockPage.getByLabel('Weight (kg)').fill('75')
      await mockPage.getByLabel('Height (cm)').fill('180')
      await mockPage.getByLabel('Gender').fill('female')
      const mockClientForm = mockPage.getByTestId('mock-client-form')
      await takeScreenshot(mockClientForm, 'mock-hrm-client-form.png')
    })
  })
})
