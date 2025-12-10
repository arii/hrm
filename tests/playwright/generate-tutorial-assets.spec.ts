import { test, expect } from '@playwright/test'

// Define where screenshots will be saved
const ASSET_PATH = 'public/assets/tutorial'

test.describe('Tutorial Asset Generator', () => {
  // Set a consistent viewport for professional-looking screenshots
  test.use({ viewport: { width: 1280, height: 720 } })

  test('Capture user journey workflow screenshots', async ({ page }) => {
    // 1. DASHBOARD - Initial State
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${ASSET_PATH}/01-dashboard-initial.png` })

    // 2. MOCK DATA PAGE - Navigation to Mock Streamer
    await page.goto('/client/mock')
    await page.waitForLoadState('networkidle')
    // Take a screenshot of the mock connection page
    await page.screenshot({ path: `${ASSET_PATH}/02-connect-page.png` })

    // 3. MOCK DATA - Connecting "Bluetooth" (Simulated)
    // We use the Mock HRM feature to simulate a device connection for the tutorial
    await page.getByLabel('User Name').fill('Tutorial User')
    await page.getByRole('spinbutton', { name: 'Age' }).fill('35')
    await page.getByRole('button', { name: /START Continuous Stream/i }).click()
    // Wait for the UI to reflect "Streaming" state
    await expect(
      page.getByRole('button', { name: /STOP Streaming/i })
    ).toBeVisible()
    await page.screenshot({ path: `${ASSET_PATH}/03-device-connected.png` })

    // 4. SPOTIFY - Login Prompt
    // Navigate to the controls or wherever the Spotify login lives
    await page.goto('/client/control')
    await expect(page.getByText('Spotify')).toBeVisible()
    await page.screenshot({ path: `${ASSET_PATH}/04-spotify-login-prompt.png` })

    // 5. TIMER - Usage
    // Interact with the timer controls
    await page.getByTestId('work-duration-input').fill('20')
    await page.getByTestId('rest-duration-input').fill('10')
    await page.getByRole('button', { name: /Start/i }).click()
    // Wait a second for the timer to visually update
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${ASSET_PATH}/05-timer-running.png` })

    // 6. HEART RATE ZONES - Mock Data Variation
    // Go to the mock page to increase the heart rate
    await page.goto('/client/mock')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Zone 4' }).click()

    // Navigate back to dashboard to see the live data
    await page.goto('/')

    // Wait for the UI to update to "Zone 4" (Orange/Red)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${ASSET_PATH}/06-zone-high-intensity.png` })
  })
})
