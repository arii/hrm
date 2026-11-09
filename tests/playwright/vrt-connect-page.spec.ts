import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'
import { MOBILE_VIEWPORT } from './lib/viewports'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady, waitForWebSocketConnection } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'
import { getHrMasks, getUserSettingsMasks } from './lib/masks'
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

    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeVisible()

    // Deterministic injection point: the page fires a silent auto-connect
    // ~100ms after the WebSocket connects, and its no-device failure
    // resets status/message. Every test below injects post-hoc state, so
    // wait for the socket AND the silent attempt to settle first;
    // otherwise a late completion wipes the injected state mid-assert
    // (flaky connection-status-alert timeouts).
    await waitForWebSocketConnection(connectPage, {
      timeout: VRT_TIMEOUTS.STANDARD,
    })
    await connectPage.waitForTimeout(2500)
  })

  test('spotify footer hidden on stream page', async ({ connectPage }) => {
    // Dashboard-only bar must not sit at the bottom of /client/connect.
    await expect(
      connectPage.getByTestId('global-spotify-footer-wrapper')
    ).toBeHidden()
  })

  test('scanning state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.__TEST_CONTROLS__!.setHrmStatus!(status)
      window.__TEST_CONTROLS__!.setCustomHrmStatusMessage!(
        'Checking saved devices...'
      )
    }, BluetoothConnectionStatus.CONNECTING)

    await connectPage.waitForSelector('[data-testid="connection-status-alert"]')
    await expect(
      connectPage.getByTestId('connection-status-alert')
    ).toContainText('Checking saved devices...')
    await takeScreenshot(connectPage, 'connect-page-scanning.png', {
      mask: getUserSettingsMasks(connectPage),
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
      mask: [
        connectPage.getByTestId('hr-tile-name'),
        ...getHrMasks(connectPage),
      ],
      maxDiffPixelRatio: 0.1,
    })
  })

  test('connection error state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.__TEST_CONTROLS__!.setHrmStatus!(status)
      window.__TEST_CONTROLS__!.setCustomHrmStatusMessage!(
        'Connection Failed: GATT server not found. Please try again.'
      )
    }, BluetoothConnectionStatus.ERROR)
    await expect(
      connectPage.getByText(/Connection Failed: GATT server not found/)
    ).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-connection-error.png', {
      mask: getUserSettingsMasks(connectPage),
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      // Performance: Skip repeated a11y checks for error states as the core UI is already validated
      skipA11y: true,
    })
  })

  test('no devices found state', async ({ connectPage }) => {
    await connectPage.evaluate(
      (status) => window.__TEST_CONTROLS__!.setHrmStatus!(status),
      BluetoothConnectionStatus.DISCONNECTED
    )
    // The button should be visible and ready for another attempt.
    await expect(
      connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-no-devices-found.png', {
      mask: getUserSettingsMasks(connectPage),
      // Performance: Skip redundant a11y checks for similar disconnected states
      skipA11y: true,
    })
  })

  test('auto-connect failed state', async ({ connectPage }) => {
    await connectPage.evaluate((status) => {
      window.__TEST_CONTROLS__!.setHrmStatus!(status)
      window.__TEST_CONTROLS__!.setCustomHrmStatusMessage!(
        'Auto-connect failed. Use Connect button to select device.'
      )
    }, BluetoothConnectionStatus.DISCONNECTED)
    await expect(connectPage.getByText(/Auto-connect failed/)).toBeVisible()
    await takeScreenshot(connectPage, 'connect-page-auto-connect-failed.png', {
      mask: getUserSettingsMasks(connectPage),
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      // Performance: Skip a11y check for this specific error variant; primary state is covered
      skipA11y: true,
    })
  })

  test('mobile viewport', async ({ connectPage }) => {
    await connectPage.setViewportSize(MOBILE_VIEWPORT)
    await takeScreenshot(connectPage, 'connect-page-mobile.png', {
      mask: [
        connectPage.getByTestId('hr-tile-name'),
        ...getHrMasks(connectPage),
      ],
    })
  })
})
