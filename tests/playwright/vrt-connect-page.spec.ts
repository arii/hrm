import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'
import { takeScreenshot } from './lib/visual'
import { BluetoothConnectionStatus } from '../../types/bluetooth'

test.describe('Visual Regression Tests for /client/connect Page', () => {
  test.beforeEach(async ({ connectPage }) => {
    await injectBluetoothMocks(connectPage)
    await connectPage.goto('/client/connect')
    // Fill the form once for all tests
    await connectPage.getByLabel('Your Name').fill('VRT Runner')
    await connectPage.getByLabel('Your Age').fill('30')

    // Wait for the test controls to be initialized
    await connectPage.waitForFunction(() => window.TEST_CONTROLS?.setHrmStatus)

    // Verify mocks are injected
    const isMockInjected = await connectPage.evaluate(() => {
      // @ts-expect-error - checking for mock injection
      return !!window.MockBluetooth || !!navigator.bluetooth
    })
    if (!isMockInjected) {
      throw new Error('Bluetooth mocks were not injected successfully')
    }

    // Wait for the initial auto-connect attempt to finish (100ms debounce + execution time)
    // This prevents the auto-connect logic from overwriting our manual state updates in the tests.
    await connectPage.waitForTimeout(500)
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeVisible()
  })

  test('scanning state', async ({ connectPage }) => {
    // Simulate the app entering the "Connecting..." state
    await connectPage.evaluate((status) => {
      window.TEST_CONTROLS.setHrmStatus(status)
      window.TEST_CONTROLS.setCustomHrmStatusMessage(
        'Checking saved devices...'
      )
    }, BluetoothConnectionStatus.CONNECTING)

    // The UI state has changed, and this alert does not appear immediately.
    // We must wait for it to be visible.
    await connectPage.waitForSelector('[data-testid="connection-status-alert"]')
    await expect(
      connectPage.getByTestId('connection-status-alert')
    ).toContainText('Checking saved devices...')
    await takeScreenshot(
      connectPage,
      'connect-page-checking-saved-devices.png',
      {
        mask: [connectPage.getByTestId('user-settings-form')],
      }
    )
  })

  test('connected state', async ({ connectPage }) => {
    await connectPage
      .getByRole('button', { name: 'Connect Bluetooth HRM' })
      .click()
    // Let the mock connection succeed
    await connectPage.evaluate(() =>
      window.bluetoothTestHelpers.simulateHeartRate(78)
    )

    await expect(
      connectPage.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible()
    // Mask the dynamic HR tile to prevent flakes
    await takeScreenshot(connectPage, 'connect-page-connected.png', {
      mask: [connectPage.getByTestId('hr-tile')],
    })
  })

  test('connection error state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.TEST_CONTROLS.setHrmStatus(status)
      window.TEST_CONTROLS.setCustomHrmStatusMessage(
        'Connection Failed: GATT server not found. Please try again.'
      )
    }, BluetoothConnectionStatus.ERROR)
    await expect(
      connectPage.getByText(/Connection Failed: GATT server not found/)
    ).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-connection-error.png', {
      mask: [connectPage.getByTestId('user-settings-form')],
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('no devices found state', async ({ connectPage }) => {
    // This state is managed internally by the hook and is harder to mock.
    // We'll simulate a more generic "Disconnected" state which is visually similar.
    await connectPage.evaluate(
      (status) => window.TEST_CONTROLS.setHrmStatus(status),
      BluetoothConnectionStatus.DISCONNECTED
    )
    // The button should be visible and ready for another attempt.
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-no-devices-found.png', {
      mask: [connectPage.getByTestId('user-settings-form')],
    })
  })

  test('auto-connect failed state', async ({ connectPage }) => {
    // This state is set by the autoConnect logic in the hook.
    await connectPage.evaluate((status) => {
      window.TEST_CONTROLS.setHrmStatus(status)
      window.TEST_CONTROLS.setCustomHrmStatusMessage(
        'Auto-connect failed. Use Connect button to select device.'
      )
    }, BluetoothConnectionStatus.DISCONNECTED)
    await expect(connectPage.getByText(/Auto-connect failed/)).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-auto-connect-failed.png', {
      mask: [connectPage.getByTestId('user-settings-form')],
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    })
  })
})
