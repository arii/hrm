// File: tests/playwright/bluetooth-flow.spec.ts
import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'

test.describe('Bluetooth HRM Connection', () => {
  // Increase the timeout for this specific test file due to the slow server warm-up fixture
  test.setTimeout(30000)

  test.beforeEach(async ({ connectPage }) => {
    await injectBluetoothMocks(connectPage)
    await connectPage.goto('/client/connect')
  })

  test('successfully connects to a new device via requestDevice', async ({
    connectPage,
  }) => {
    await connectPage.getByLabel('Your Name').fill('Test Runner')
    await connectPage.getByLabel('Your Age').fill('30')

    await connectPage
      .getByRole('button', { name: 'Connect Bluetooth HRM' })
      .click()

    // Simulate receiving a heart rate value to complete the connection flow
    await connectPage.evaluate(() => {
      window.bluetoothTestHelpers.simulateHeartRate(78)
    })

    // Assert Connected State
    await expect(
      connectPage.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible()
    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible()

    // The "Forget" logic is part of the "Reset" button, which should be visible after connection.
    const resetButton = connectPage.getByRole('button', {
      name: 'Reset System & Device',
    })
    await expect(resetButton).toBeVisible()
  })

  test('robustness: handles stale connection by forgetting and prompting', async ({
    connectPage,
  }) => {
    // 1. Setup a "saved" device that will fail to connect
    await connectPage.context().addCookies([
      {
        name: 'hrm_device_id',
        value: 'stale-device-id',
        domain: 'localhost',
        path: '/',
      },
    ])
    await connectPage.evaluate(() => {
      const badDevice = new window.MockBluetoothDevice(
        'stale-device-id',
        'Stale HRM'
      )
      badDevice._shouldFailConnection = true
      navigator.bluetooth.getDevices = async () => [badDevice]
    })

    await connectPage.reload()

    // NOTE: We do NOT re-inject mocks here. The page reload carries over the initial script injection.
    // Re-injecting would reset the mock's internal state, defeating the purpose of the test.

    // 3. Attempt connection with user details
    await connectPage.getByLabel('Your Name').fill('Recover User')
    await connectPage.getByLabel('Your Age').fill('25')
    await connectPage
      .getByRole('button', { name: 'Connect Bluetooth HRM' })
      .click()

    // 4. Verify the recovery flow
    // The app should fail to connect to the "stale" device, forget it,
    // and then pop a new device picker. Our mock resolves this picker instantly
    // with a *new*, working device. We then simulate its heart rate.
    await connectPage.evaluate(() => {
      window.bluetoothTestHelpers.simulateHeartRate(88)
    })

    // The UI should eventually show "Connected" to the NEW device.
    await expect(
      connectPage.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible({ timeout: 10000 })
    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible() // Note: Connects to the default working mock
  })

  test('Reset Server button triggers device forget', async ({
    connectPage,
  }) => {
    // 1. Connect first
    await connectPage.getByLabel('Your Name').fill('Reset Tester')
    await connectPage.getByLabel('Your Age').fill('25')
    await connectPage
      .getByRole('button', { name: 'Connect Bluetooth HRM' })
      .click()

    // Simulate heart rate to complete connection
    await connectPage.evaluate(() => {
      window.bluetoothTestHelpers.simulateHeartRate(75)
    })

    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible()

    // 2. Click Reset
    const resetButton = connectPage.getByRole('button', {
      name: 'Reset System & Device',
    })
    await resetButton.scrollIntoViewIfNeeded()
    await resetButton.click()

    // 3. Assert UI returns to initial state
    await expect(connectPage.getByLabel('Your Name')).toBeVisible()
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeEnabled()
    await expect(connectPage.getByText('Connected to:')).not.toBeVisible()
  })
})
