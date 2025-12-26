import { test, expect } from '@playwright/test'

test.describe('WebSocket Stability', () => {
  test('should maintain a stable WebSocket connection', async ({ page }) => {
    test.setTimeout(40000)
    await page.goto('/')

    // Wait for the WebSocket connection to be established
    await page.waitForFunction(() => (window as any).__TEST_WEBSOCKET_READY__ === true, null, {
      timeout: 10000,
    })

    // Check the connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).toHaveText('Connected', { timeout: 10000 })

    // The server's ConnectionMonitor has a 30-second interval. We'll wait for
    // 35 seconds to ensure at least one native ping/pong cycle has completed.
    await page.waitForTimeout(35000)

    // Verify that the connection is still stable
    await expect(connectionStatus).toHaveText('Connected')
  })
})
