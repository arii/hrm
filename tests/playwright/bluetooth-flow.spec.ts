// @ts-nocheck
import { test, expect } from './lib'

test.describe('Bluetooth HRM Flow', () => {
  test('should connect to a mock bluetooth device and stream data', async ({
    page,
  }) => {
    await page.goto('/client/connect')

    // Click the connect button
    await page.getByRole('button', { name: 'Connect' }).click()

    // The test environment uses a mock bluetooth device, so we can assert that the connection was successful
    await expect(page.getByText('Connected')).toBeVisible()

    // Now, let's simulate some data
    await page.evaluate(() => {
      window.bluetoothTestHelpers.simulateHeartRate(120)
    })

    // And assert that the data is visible on the page
    await expect(page.getByText('120')).toBeVisible()
  })
})
