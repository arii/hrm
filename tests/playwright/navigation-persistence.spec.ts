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

    await page.waitForTimeout(3000)
    const durationText = await page
      .getByText(/00:00:0/)
      .first()
      .textContent()
    expect(durationText).not.toBe('00:00:00')

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

    const returnedDurationText = await page
      .getByText(/00:00:/)
      .first()
      .textContent()
    expect(returnedDurationText).not.toBe('00:00:00')

    const today = new Date().toLocaleDateString(undefined, { year: 'numeric' })
    await expect(page.getByText(today)).toBeVisible()
  })
})
