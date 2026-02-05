import { test, expect, Page } from '@playwright/test'
import { ServerMessage } from '../../types/websocket'
import { STALE_TILE_REMOVAL_THRESHOLD_MS } from '../../constants/hrm'

// Helper to send messages via postMessage
async function dispatch(page: Page, message: ServerMessage) {
  await page.evaluate((msg) => {
    window.postMessage(msg, '*')
  }, message)
}

test.describe('Stale Tile Removal', () => {
  test.beforeEach(async ({ page }) => {
    // Install clock before navigation to ensure we control time from the start
    await page.clock.install({ time: new Date() })
  })

  test('removes tile after inactivity threshold', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be hydrated and listener attached
    await page.waitForTimeout(1000)

    // 1. Simulate active data
    await dispatch(page, {
      type: 'HRM_UPDATE',
      payload: [
        {
          clientId: 'test-1',
          name: 'test-1',
          value: 75,
          maxHr: 190,
          age: 30,
          calories: 10,
        },
      ],
    })

    // Verify the tile appears
    await expect(page.locator('text=test-1')).toBeVisible()

    // 2. Fast forward time past the threshold
    // Adding a small buffer to ensure we definitely cross the threshold
    await page.clock.fastForward(STALE_TILE_REMOVAL_THRESHOLD_MS + 1000)

    // 3. Verify tile is gone
    await expect(page.locator('text=test-1')).not.toBeVisible()
  })
})
