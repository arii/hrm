// tests/playwright/auto-start.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Workout Auto-Start Feature', () => {
  test('should allow configuration and trigger auto-start', async ({
    page,
  }) => {
    // 1. Configure Auto-Start
    await page.goto('/settings')
    await page.getByLabel('Enable Workout Auto-Start').check()
    await page.getByLabel('Heart Rate Threshold (BPM)').fill('80')
    await page.getByLabel('Sustained Duration (seconds)').fill('5')

    // 2. Go to Dashboard and Mock HRM Data
    await page.goto('/')
    await page.waitForFunction(() => (window as any).__TEST_WEBSOCKET_READY__)
    await page.evaluate(() => {
      ;(window as any).sendMockHrmData({
        type: 'HRM_INPUT',
        payload: { clientId: 'test-client', heartRate: 90, value: 90 },
      })
    })

    // 3. Verify Detection and Countdown Toasts
    await expect(
      page.getByText('Sustained high heart rate detected...')
    ).toBeVisible()
    await expect(page.getByText('Starting in 10s...')).toBeVisible({
      timeout: 6000,
    }) // Wait for sustained duration

    // 4. Cancel Auto-Start
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(
      page.getByText('Workout auto-start cancelled.')
    ).toBeVisible()

    // 5. Re-trigger and Verify Auto-Start
    await page.evaluate(() => {
      ;(window as any).sendMockHrmData({
        type: 'HRM_INPUT',
        payload: { clientId: 'test-client', heartRate: 90, value: 90 },
      })
    })

    await expect(
      page.getByText('Sustained high heart rate detected...')
    ).toBeVisible()
    await expect(page.getByText('Starting in 10s...')).toBeVisible({
      timeout: 6000,
    })
    await expect(
      page.getByText('Workout session started automatically!')
    ).toBeVisible({ timeout: 11000 }) // Wait for countdown to finish
  })
})
