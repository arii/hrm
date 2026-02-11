import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-helpers'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'

test.describe('Session Persistence & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await injectBluetoothMocks(page)
  })

  test('should persist active workout state when navigating between tabs', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/client/connect`)

    // Use placeholder to avoid ambiguity with "page" in BottomNavBar labels
    const ageInput = page.getByPlaceholder(/30/)
    await ageInput.fill('30')
    await ageInput.blur()

    const connectBtn = page.getByRole('button', {
      name: /connect bluetooth hrm/i,
    })
    await expect(connectBtn).toBeEnabled()
    await connectBtn.click()

    await expect(
      page.getByText('Connected! Heart rate data is being streamed')
    ).toBeVisible({ timeout: 10000 })

    const startBtn = page.getByRole('button', { name: /start/i })
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    await expect(page.getByText('RUNNING')).toBeVisible()

    // Web-first assertion: Wait for the timer to advance past 00:00:00
    await expect(page.getByText(/00:00:0[1-9]/).first()).toBeVisible({
      timeout: 10000,
    })

    await page
      .getByRole('link', { name: /navigate to phone controls page/i })
      .click()
    await expect(page).toHaveURL(/.*\/client\/control/)
    await expect(page.getByText('RUNNING')).not.toBeVisible()

    await page
      .getByRole('link', { name: /navigate to stream heart rate page/i })
      .click()
    await expect(page).toHaveURL(/.*\/client\/connect/)

    await expect(page.getByText('RUNNING')).toBeVisible()
    await expect(page.getByText('Workout Summary')).toBeVisible()

    // Verify timer is still advanced
    await expect(page.getByText(/00:00:/).first()).not.toHaveText('00:00:00')

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric' })
    await expect(page.getByText(today)).toBeVisible()
  })
})
