import { test, expect } from '@playwright/test'
import { ServerMessage } from '../../types/websocket'

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
    }, message)
  }

  // 1. Simulate active data
  await dispatch({
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: 'test-1',
        value: 75,
        name: 'test-1',
        age: 30,
        maxHr: 190,
        restingHr: 60,
        zone: 'warmup',
        calories: 10,
      },
    ],
  })
  await expect(page.locator('text=test-1')).toBeVisible()

  await page.clock.fastForward(35000)

  await expect(page.locator('text=test-1')).not.toBeVisible()
})
