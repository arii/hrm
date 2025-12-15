
import { test, expect } from '@playwright/test'

test('Styled Snackbar is visible with correct styling', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/test-error')
  await page.click('button:has-text("Trigger Error")')
  const snackbar = await page.waitForSelector('.MuiSnackbar-root')
  await expect(snackbar).toBeVisible()
  await page.screenshot({ path: 'test-results/styled-snackbar.png' })
})
