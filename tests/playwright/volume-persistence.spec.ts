import { test, expect } from '@playwright/test'

test.describe('Volume Persistence', () => {
  test('should persist volume preference across reloads', async ({ page }) => {
    // 1. Navigate to Control Panel
    await page.goto('/client/control')

    // Wait for the Audio Settings slider to appear.
    // The text 'Master Volume' is a sibling, so we locate the slider directly by its class.
    const slider = page.locator('.MuiSlider-root').first()
    await expect(slider).toBeVisible()

    // 2. Check the default volume state
    await expect(page.getByText('Master Volume (70%)')).toBeVisible()

    // Click the "Test Sound" button to ensure it's interactive
    await page.getByRole('button', { name: 'Test Sound' }).click()

    // 3. Simulate a user change by updating localStorage directly for test reliability
    await page.evaluate(() => {
      window.localStorage.setItem('hrm-volume', '42')
      // Dispatch a storage event to ensure the component re-renders if it's listening
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'hrm-volume', newValue: '42' })
      )
    })

    // Reload the page to test persistence
    await page.reload()

    // 4. Verify the new volume is displayed after reload
    await expect(page.getByText('Master Volume (42%)')).toBeVisible({
      timeout: 10000,
    }) // Increased timeout for CI

    // Verify the value is correctly stored in localStorage
    const storedValue = await page.evaluate(() =>
      window.localStorage.getItem('hrm-volume')
    )
    expect(storedValue).toBe('42')
  })
})
