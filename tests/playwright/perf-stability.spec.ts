import { test, expect } from '@playwright/test'

interface WindowWithTestFlags extends Window {
  __TEST_WEBSOCKET_READY__?: boolean
}

test.describe('WebSocket Stability', () => {
  test('should maintain a stable WebSocket connection', async ({ page }) => {
    test.setTimeout(40000)
    await page.goto('/')

    // Wait for the WebSocket connection to be established
    await page.waitForFunction(
      () => (window as WindowWithTestFlags).__TEST_WEBSOCKET_READY__ === true,
      null,
      {
        timeout: 10000,
      }
    )

    // Check that the connection status indicator is not visible
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).not.toBeVisible()

    // The server's ConnectionMonitor has a 30-second interval. We'll wait for
    // 35 seconds to ensure at least one native ping/pong cycle has completed.
    await page.waitForTimeout(35000)

    // Verify that the connection is still stable and the indicator is not visible
    await expect(connectionStatus).not.toBeVisible()
  })
})
