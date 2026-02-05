import { test, expect } from '@playwright/test'

test('should remove tile after 35 seconds of inactivity', async ({ page }) => {
  // Install mock clock
  await page.clock.install({ time: new Date() })

  await page.goto('/client/control')
  // 1. Simulate active data
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

  // 2. Fast-forward time
  await page.clock.fastForward(35000)

  // 3. Assert removal
  await expect(page.locator('text=test-1')).not.toBeVisible()
})
