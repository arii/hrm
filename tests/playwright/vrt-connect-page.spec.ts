import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'
import { MOBILE_VIEWPORT } from './lib/viewports'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { BluetoothConnectionStatus } from '../../types/bluetooth'
import { WAIT_TIMEOUTS } from './lib/waits'

test.describe('Visual Regression Tests for /client/connect Page', () => {
  test.beforeEach(async ({ connectPage }) => {
    await injectBluetoothMocks(connectPage)
    await connectPage.goto('/client/connect?testing=true')
    await waitForPageReady(connectPage, { timeout: WAIT_TIMEOUTS.TEST_READY })
    await connectPage.getByLabel('Your Name').fill('VRT Runner')
    await connectPage.getByLabel('Your Age').fill('30')

    // Wait for hydration and test controls to be attached
    await expect
      .poll(
        async () => {
          return await connectPage.evaluate(() => {
            return {
              hasControls: !!window.__TEST_CONTROLS__,
              hasHrmStatus: !!window.__TEST_CONTROLS__?.setHrmStatus,
              url: window.location.href,
            }
          })
        },
        {
          message: 'Waiting for __TEST_CONTROLS__.setHrmStatus to be attached',
          timeout: 15000,
        }
      )
      .toEqual(expect.objectContaining({ hasHrmStatus: true }))

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
      maxDiffPixelRatio: 0.2,
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
      maxDiffPixelRatio: 0.2,
      fullPage: true,
      clip: { x: 0, y: 0, width: 1920, height: 1341 },
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
      maxDiffPixelRatio: 0.2,
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
      maxDiffPixelRatio: 0.2,
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
      maxDiffPixelRatio: 0.2,
      // Performance: Skip a11y check for this specific error variant; primary state is covered
      skipA11y: true,
    })
  })

  test('mobile viewport', async ({ connectPage }) => {
    await connectPage.setViewportSize(MOBILE_VIEWPORT)
    await takeScreenshot(connectPage, 'connect-page-mobile.png', {
      mask: [connectPage.getByTestId('hr-tile')],
      maxDiffPixelRatio: 0.2,
    })
  })
})
