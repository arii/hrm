import { test, expect, Page } from '@playwright/test'
import { ServerMessage } from '../../types/websocket'

// Helper to send messages via postMessage
async function dispatch(page: Page, message: ServerMessage) {
  await page.evaluate((msg) => {
    window.postMessage(msg, '*')
  }, message)
}

test.describe('Snapshot Synchronization', () => {
  test('removes tile when absent from server update', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be hydrated and listener attached
    await page.waitForFunction(
      () =>
        (window as unknown as { __TEST_CONTROLS__: unknown }).__TEST_CONTROLS__
    )

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

    // 2. Simulate update where test-1 is missing
    await dispatch(page, {
      type: 'HRM_UPDATE',
      payload: [],
    })

    // 3. Verify tile is gone immediately
    await expect(page.locator('text=test-1')).not.toBeVisible()
  })
})
