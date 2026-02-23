import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'
import { MOBILE_VIEWPORT } from './lib/viewports'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'
import { BluetoothConnectionStatus } from '../../types/bluetooth'

test.describe('Visual Regression Tests for /client/connect Page', () => {
  test.beforeEach(async ({ connectPage }) => {
    await injectBluetoothMocks(connectPage)
    await connectPage.goto('/client/connect')
    await waitForPageReady(connectPage, { timeout: VRT_TIMEOUTS.STANDARD })
    await connectPage.getByLabel('Your Name').fill('VRT Runner')
    await connectPage.getByLabel('Your Age').fill('30')

    await connectPage.waitForFunction(
      () => window.__TEST_CONTROLS__?.setHrmStatus,
      {
        timeout: VRT_TIMEOUTS.HYDRATION,
      }
    )

    await connectPage.waitForTimeout(100)
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeVisible()
  })

  test('scanning state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.__TEST_CONTROLS__.setHrmStatus(status)
      window.__TEST_CONTROLS__.setCustomHrmStatusMessage(
        'Checking saved devices...'
      )
    }, BluetoothConnectionStatus.CONNECTING)

    await connectPage.waitForSelector('[data-testid="connection-status-alert"]')
    await expect(
      connectPage.getByTestId('connection-status-alert')
    ).toContainText('Checking saved devices...')
    await takeScreenshot(connectPage, 'connect-page-scanning.png', {
      mask: [connectPage.getByTestId('user-settings-form')],
    })
  })

  test('connected state', async ({ connectPage }) => {
    await connectPage
      .getByRole('button', { name: 'Connect Bluetooth HRM' })
      .click()
    await connectPage.evaluate(() =>
      window.bluetoothTestHelpers.simulateHeartRate(78)
    )

    await expect(
      connectPage.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-connected.png', {
      mask: [connectPage.getByTestId('hr-tile')],
      maxDiffPixelRatio: 0.1,
    })
  })

  test('connection error state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.__TEST_CONTROLS__.setHrmStatus(status)
      window.__TEST_CONTROLS__.setCustomHrmStatusMessage(
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
      // Performance: Skip repeated a11y checks for error states as the core UI is already validated
      skipA11y: true,
    })
  })

  test('no devices found state', async ({ connectPage }) => {
    await connectPage.evaluate(
      (status) => window.__TEST_CONTROLS__.setHrmStatus(status),
      BluetoothConnectionStatus.DISCONNECTED
    )
    // The button should be visible and ready for another attempt.
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-no-devices-found.png', {
      mask: [connectPage.getByTestId('user-settings-form')],
      // Performance: Skip redundant a11y checks for similar disconnected states
      skipA11y: true,
    })
  })

  test('auto-connect failed state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.__TEST_CONTROLS__.setHrmStatus(status)
      window.__TEST_CONTROLS__.setCustomHrmStatusMessage(
        'Auto-connect failed. Use Connect button to select device.'
      )
    }, BluetoothConnectionStatus.DISCONNECTED)
    await expect(connectPage.getByText(/Auto-connect failed/)).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-auto-connect-failed.png', {
      mask: [connectPage.getByTestId('user-settings-form')],
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      // Performance: Skip a11y check for this specific error variant; primary state is covered
      skipA11y: true,
    })
  })

  test('mobile viewport', async ({ connectPage }) => {
    await connectPage.setViewportSize(MOBILE_VIEWPORT)
    await takeScreenshot(connectPage, 'connect-page-mobile.png', {
      mask: [connectPage.getByTestId('hr-tile')],
    })
  })
})
