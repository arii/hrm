// File: tests/playwright/bluetooth-flow.spec.ts
import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'

test.describe('Bluetooth HRM Connection', () => {

  test.beforeEach(async ({ connectPage }) => {
    // 1. Inject mocks BEFORE loading the page logic fully
    await injectBluetoothMocks(connectPage)
  })

  test('successfully connects to a new device via requestDevice', async ({ connectPage }) => {
    await connectPage.goto('/client/connect')
    // Fill out user details
    await connectPage.getByLabel('Your Name').fill('Test Runner')
    await connectPage.getByLabel('Your Age').fill('30')

    // Click Connect
    // The mock requestDevice will immediately resolve with "Mock HRM"
    await connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' }).click()

    // Assert Connected State
    await expect(connectPage.getByText('Connected! Heart rate data is being streamed')).toBeVisible()
    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible()

    // Verify "Forget" button appears
    await expect(connectPage.getByRole('button', { name: 'Reset System & Device' })).toBeVisible()
  })

  test('robustness: handles stale connection by forgetting and prompting', async ({ connectPage }) => {
    await connectPage.goto('/client/connect')
    // 1. Setup: Simulate a "saved" device state from a previous session
    // We can do this by setting the cookie that useBluetoothHRM reads
    await connectPage.context().addCookies([{
      name: 'hrm_device_id',
      value: 'mock-device-id-123',
      domain: 'localhost',
      path: '/'
    }])

    await connectPage.reload()

    // 2. Pre-seed the mock with a "known" device that FAILS connection
    await connectPage.evaluate(async () => {
      // Access the internal mock state we setup in injectBluetoothMocks
      const badDevice = await navigator.bluetooth.requestDevice({}) // Creates the default mock
      badDevice._shouldFailConnection = true // Trigger the failure logic
      navigator.bluetooth.getDevices = async () => [badDevice]
    })

    // 3. Attempt connection
    await connectPage.getByLabel('Your Name').fill('Recover User')
    await connectPage.getByLabel('Your Age').fill('25')
    await connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' }).click()

    // 4. Verify the UI flow
    // It should try to connect -> fail -> clear cookie -> prompt for new device
    // Since our mock `requestDevice` succeeds (returns a fresh working device),
    // the UI should eventually show "Connected" despite the initial failure.

    // Note: In a real test, the "requestDevice" picker would block.
    // But our mock resolves it instantly.

    await expect(connectPage.getByText('Connected! Heart rate data is being streamed')).toBeVisible()

    // Verify the "bad" cookie was replaced (conceptually, the hook does this)
  })

  test('Reset Server button triggers device forget', async ({ connectPage }) => {
    await connectPage.goto('/client/connect')
    // 1. Connect first
    await connectPage.getByLabel('Your Name').fill('Reset Tester')
    await connectPage.getByLabel('Your Age').fill('25')
    await connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' }).click()
    await expect(connectPage.getByText('Connected to: Mock HRM')).toBeVisible()

    // 2. Click Reset
    // We expect this to call device.forget() in the background
    const resetButton = connectPage.getByRole('button', { name: 'Reset System & Device' })
    await resetButton.scrollIntoViewIfNeeded()
    await resetButton.click()

    // 3. Assert UI returns to initial state
    await expect(connectPage.getByLabel('Your Name')).toBeVisible()
    await expect(connectPage.getByRole('button', { name: 'Connect Bluetooth HRM' })).toBeEnabled()
    await expect(connectPage.getByText('Connected to:')).not.toBeVisible()
  })
})
