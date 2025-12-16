// File: tests/playwright/bluetooth-persistence.spec.ts
import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'

test.describe('Bluetooth HRM Connection Persistence', () => {
  test.beforeEach(async ({ connectPage }) => {
    // Inject the mock Bluetooth API into the page context
    await injectBluetoothMocks(connectPage)
    // Navigate to the connect page before each test
    await connectPage.goto('/client/connect')
  })

  test('should maintain connection status when navigating away and back', async ({
    connectPage,
    page,
  }) => {
    // 1. Establish the initial connection
    await connectPage.getByLabel('Your Name').fill('Persistence Tester')
    await connectPage.getByLabel('Your Age').fill('35')
    await connectPage
      .getByRole('button', { name: 'Connect Bluetooth HRM' })
      .click()

    // Simulate receiving a heart rate value to complete the connection
    await connectPage.evaluate(() => {
      window.bluetoothTestHelpers.simulateHeartRate(80)
    })

    // 2. Verify the connected state on the connect page
    await expect(
      connectPage.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible()
    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible()

    // 3. Navigate to a different page (the main dashboard)
    await page.goto('/', { waitUntil: 'networkidle' })
    // Verify that navigation was successful by checking for a known element
    await expect(
      page.getByRole('heading', { name: 'HRM Dashboard' })
    ).toBeVisible()

    // 4. Navigate back to the connect page
    await page.goto('/client/connect')

    // 5. Verify that the connection status is still "Connected"
    // This is the key assertion: the state should have persisted in the global context.
    await expect(
      connectPage.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible()
    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible()

    // Also, the connect button should NOT be visible, as we are already connected.
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).not.toBeVisible()
  })
})
