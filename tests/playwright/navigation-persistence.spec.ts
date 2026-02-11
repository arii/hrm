import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-helpers'

test.describe('Session Persistence & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Bluetooth API to enable "Connect" button functionality
    await page.addInitScript(() => {
      class MockBluetoothDevice {
        id = 'mock-device-id'
        name = 'Mock HRM'
        gatt = {
          connected: false,
          connect: async function () {
            // @ts-expect-error: mocking
            this.connected = true
            return {
              getPrimaryService: async () => ({
                getCharacteristic: async () => ({
                  startNotifications: async () => {},
                  addEventListener: () => {},
                  writeValue: async () => {},
                }),
              }),
            }
          },
          disconnect: async function () {
            // @ts-expect-error: mocking
            this.connected = false
          },
        }
        addEventListener() {}
        removeEventListener() {}
        watchAdvertisements() {
          return Promise.resolve()
        }
      }

      const mockDevice = new MockBluetoothDevice()

      // @ts-expect-error: mocking
      navigator.bluetooth = {
        requestDevice: async () => mockDevice,
        getDevices: async () => [mockDevice],
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    })
  })

  test('should persist active workout state when navigating between tabs', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/client/connect`)

    // 2. Setup User (Enter Age to enable Connect button)
    const ageInput = page.getByLabel('Your Age')
    await ageInput.fill('30')
    await ageInput.blur() // Trigger validation

    const nameInput = page.getByLabel('Your Name')
    await nameInput.fill('Test User')
    await nameInput.blur()

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

    // 5. Verify Workout Auto-started (triggered by useBluetoothHRM.onConnect)
    // Check for specific UI element from the new WorkoutSummary component
    await expect(page.getByText('RUNNING')).toBeVisible()

    // 6. Verify Timer is Running
    // Wait a few seconds to let timer increment
    await page.waitForTimeout(3000)
    const durationText = await page
      .getByText(/00:00:0/)
      .first()
      .textContent()
    expect(durationText).not.toBe('00:00:00')

    // 7. Navigate Away (To Experimental Page)
    // Use the BottomNavBar
    await page
      .getByRole('link', { name: 'Navigate to Phone Controls' })
      .first()
      .click({ force: true })
    await expect(page).toHaveURL(/.*\/client\/control/)
    await expect(page.getByText('RUNNING')).not.toBeVisible() // Should not see Connect UI here

    // 8. Navigate Back
    await page
      .getByRole('link', { name: 'Navigate to Stream Heart Rate' })
      .first()
      .click({ force: true })
    await expect(page).toHaveURL(/.*\/client\/connect/)

    // 9. Assert State Persisted
    // It might briefly show PAUSED before auto-reconnecting
    await expect(page.getByText(/RUNNING|PAUSED/)).toBeVisible()

    // Wait for auto-reconnect to set it back to RUNNING if it was paused
    await expect(page.getByText('RUNNING')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('HRM Session')).toBeVisible()

    // Verify timer is still running (value should be > 0)
    const returnedDurationText = await page
      .getByText(/00:00:/)
      .first()
      .textContent()
    expect(returnedDurationText).not.toBe('00:00:00')

    // Verify the "Date" field is present
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric' })
    await expect(page.getByText(today).first()).toBeVisible()
  })
})
