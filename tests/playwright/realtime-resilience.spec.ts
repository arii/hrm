import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

test.describe('WebSocket Resilience', () => {
  test('should gracefully reconnect after server is restarted', async ({
    page,
  }) => {
    // 1. Navigate and ensure the WebSocket is CONNECTED
    await page.goto('/')
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Connected', { timeout: 15000 })

    // 2. Simulate server restart
    console.log('--- Restarting hrm-server instance for test...')
    execSync('pnpm pm2 restart hrm-server', { stdio: 'inherit' })

    // 3. Assert client-side disconnection and reconnection
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Disconnected', { timeout: 15000 })
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Connected', { timeout: 20000 })
  })
})
