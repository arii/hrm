import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import { BASE_URL } from './test-helpers'

test.beforeAll(() => {
  // Ensure PM2 is in a clean state before starting the test
  execSync('pnpm pm2 kill || true', { stdio: 'inherit' })
})

test.afterAll(() => {
  // Ensure PM2 is in a clean state after the test
  execSync('pnpm pm2 kill || true', { stdio: 'inherit' })
})

test.describe('WebSocket Resilience', () => {
  test('should gracefully reconnect after server is killed', async ({
    page,
  }) => {
    // 1. Start the server using PM2
    console.log('--- Starting hrm-server...')
    execSync('pnpm start', { stdio: 'inherit' })
    execSync('sleep 5')

    // 2. Navigate and ensure the WebSocket is CONNECTED
    await page.goto('/')
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Connected', { timeout: 15000 })

    // 3. Simulate server kill
    console.log('--- Killing hrm-server instance for test...')
    execSync('pnpm pm2 kill', { stdio: 'inherit' })

    // 4. Assert client-side disconnection state
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Disconnected', { timeout: 15000 })

    // 5. Restart the server
    console.log('--- Restarting hrm-server...')
    execSync('pnpm start', { stdio: 'inherit' })

    // 6. Assert client-side reconnection and state sync
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Connected', { timeout: 20000 })
  })
})

test.describe('Simple Smoke Test', () => {
  test.beforeEach(() => {
    execSync('pnpm start', { stdio: 'inherit' })
    execSync('sleep 5')
  })

  test.afterEach(() => {
    execSync('pnpm pm2 kill', { stdio: 'inherit' })
  })

  test('should load the homepage and have the correct title', async ({
    page,
  }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/HRM | Real-Time Heart Rate Monitor/)
  })
})
