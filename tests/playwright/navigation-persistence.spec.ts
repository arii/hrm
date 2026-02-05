import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-helpers'

test.describe('Session Persistence & Navigation', () => {
  test.setTimeout(60000)
  test.beforeEach(async ({ page }) => {
    // 1. Mock Bluetooth API to enable "Connect" button functionality
    await page.addInitScript(() => {
      class MockBluetoothDevice {
        id = 'mock-device-id'
        name = 'Mock HRM'
        gatt = {
          connect: async () => ({
            getPrimaryService: async () => ({
              getCharacteristic: async () => ({
                startNotifications: async () => {},
                addEventListener: () => {},
                writeValue: async () => {},
              }),
            }),
          }),
        }
        addEventListener() {}
        removeEventListener() {}
      }

      const mockBluetooth = {
        requestDevice: async () => new MockBluetoothDevice(),
        addEventListener: () => {},
        getDevices: async () => [new MockBluetoothDevice()],
        getAvailability: async () => true,
      }

      // Assign to navigator.bluetooth (needs to be cast as navigator properties are often read-only)
      Object.defineProperty(navigator, 'bluetooth', {
        value: mockBluetooth,
        configurable: true,
      })
    })
  })

  test('should persist active workout state when navigating between tabs', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/client/connect`)

    // 2. Setup User (Enter Age to enable Connect button)
    const nameInput = page.getByLabel(/name/i)
    await nameInput.fill('Test User')
    const ageInput = page.getByRole('spinbutton', { name: /age/i })
    await ageInput.fill('30')
    await ageInput.blur() // Trigger validation

    // 3. Connect (Simulated)
    const connectBtn = page.getByRole('button', {
      name: /connect bluetooth hrm/i,
    })
    await expect(connectBtn).toBeEnabled()
    await connectBtn.click()

    // 4. Verify Connected State
    await expect(
      page.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible({ timeout: 10000 })

    // 5. Start Workout (now happens automatically on connect)
    // 6. Verify Timer is Running
    await expect(page.getByText('RUNNING')).toBeVisible()

    // Wait a few seconds to let timer increment
    await page.waitForTimeout(3000)
    const durationTextBeforePause = await page
      .getByText(/00:00:0/)
      .first()
      .textContent()
    expect(durationTextBeforePause).not.toBe('00:00:00')

    // 7. Pause Workout
    const pauseBtn = page.getByRole('button', { name: /pause/i })
    await pauseBtn.click()
    await expect(page.getByText('PAUSED', { exact: true })).toBeVisible()

    const durationTextAtPause = await page
      .getByText(/00:00:0/)
      .first()
      .textContent()

    // 8. Navigate Away
    await page.goto(`${BASE_URL}/client/control`)
    await expect(page).toHaveURL(/.*\/client\/control/)

    // 9. Navigate Back
    await page.goto(`${BASE_URL}/client/connect`)
    await expect(page).toHaveURL(/.*\/client\/connect/)

    // 10. Assert State Persisted (initially PAUSED)
    await expect(page.getByText('PAUSED', { exact: true })).toBeVisible()
    await expect(page.getByText('HRM Session')).toBeVisible()

    const durationTextAfterReload = await page
      .getByText(/00:00:0/)
      .first()
      .textContent()
    expect(durationTextAfterReload).toBe(durationTextAtPause)

    // 11. Wait for Auto-Connect and Resume
    // This confirms that auto-connect is working and triggers resume
    await expect(page.getByText('RUNNING')).toBeVisible({ timeout: 15000 })

    await page.waitForTimeout(3000)
    const finalDurationText = await page
      .getByText(/00:00:/)
      .first()
      .textContent()

    // It should have increased
    expect(finalDurationText).not.toBe(durationTextAfterReload)
  })
})
