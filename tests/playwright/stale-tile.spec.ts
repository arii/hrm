import { test, expect } from '@playwright/test'

test('removes tile after 35 seconds of inactivity', async ({ page }) => {
  await page.clock.install({ time: new Date() })

  await page.goto('/')

  // Wait for the page to be hydrated and listener attached
  await page.waitForTimeout(1000)

  await page.evaluate(() =>
    (
      window as unknown as {
        postMessage: (message: unknown, targetOrigin: string) => void
      }
    ).postMessage(
      {
        type: 'HRM_UPDATE',
        payload: [{ clientId: 'test-1', hrm: 75, userName: 'test-1' }],
      },
      '*'
    )
  )
  await expect(page.locator('text=test-1')).toBeVisible()

  await page.clock.fastForward(35000)

  await expect(page.locator('text=test-1')).not.toBeVisible()
})
