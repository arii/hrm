import { test, expect, Page } from '@playwright/test'
import type { ServerMessage } from '@/types/websocket'

// Helper function to dispatch a WebSocket message from the client-side
const dispatchServerMessage = async (page: Page, message: ServerMessage) => {
  await page.waitForFunction(() => window.__TEST_CONTROLS__?.dispatch)
  return page.evaluate((msg: ServerMessage) => {
    if (window.__TEST_CONTROLS__?.dispatch) {
      window.__TEST_CONTROLS__.dispatch(msg)
      return true
    }
    console.error('__TEST_CONTROLS__.dispatch not found on window object')
    return false
  }, message)
}

// Helper function to disconnect the WebSocket from the client-side
const disconnectWebSocket = async (page: Page) => {
  await page.waitForFunction(() => window.__TEST_CONTROLS__?.disconnect)
  return page.evaluate(() => {
    if (window.__TEST_CONTROLS__?.disconnect) {
      window.__TEST_CONTROLS__.disconnect()
      return true
    }
    console.error('__TEST_CONTROLS__.disconnect not found on window object')
    return false
  })
}

test.describe('Timer UI Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/client/control?testing=true')
    await expect(page.locator('text=Server: Connected')).toBeVisible({
      timeout: 15000,
    })

    const stopButton = page.locator('[data-testid="stop-timer-button"]')
    try {
      await expect(stopButton).toBeVisible({ timeout: 2000 })
      await stopButton.click()
      await expect(
        page.locator('[data-testid="start-timer-button"]')
      ).toBeVisible()
    } catch {
      // Timer is already stopped.
    }
  })

  test('should correctly reflect the initial state of the timer', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="start-timer-button"]')
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="stop-timer-button"]')
    ).not.toBeVisible()
  })

  test('should optimistically update UI to "running" on start button click', async ({
    page,
  }) => {
    await page.click('[data-testid="start-timer-button"]')
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="stop-timer-button"]')
    ).toBeVisible()
  })

  test('should synchronize UI with a server-sent "start" event', async ({
    page,
  }) => {
    await disconnectWebSocket(page)
    await expect(page.locator('text=Server: Disconnected')).toBeVisible()
    await dispatchServerMessage(page, {
      type: 'TIMER_UPDATE',
      payload: { isRunning: true },
    })
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="stop-timer-button"]')
    ).toBeVisible()
  })

  test('should optimistically update UI to "stopped" on stop button click', async ({
    page,
  }) => {
    await page.click('[data-testid="start-timer-button"]')
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible()
    await page.click('[data-testid="stop-timer-button"]')
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="start-timer-button"]')
    ).toBeVisible()
  })

  test('should synchronize UI with a server-sent "stop" event', async ({
    page,
  }) => {
    await page.click('[data-testid="start-timer-button"]')
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible()

    await disconnectWebSocket(page)
    await expect(page.locator('text=Server: Disconnected')).toBeVisible()
    await dispatchServerMessage(page, {
      type: 'TIMER_UPDATE',
      payload: { isRunning: false },
    })
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="start-timer-button"]')
    ).toBeVisible()
  })

  test('should revert optimistic UI if server does not confirm "start"', async ({
    page,
  }) => {
    await disconnectWebSocket(page)
    await expect(page.locator('text=Server: Disconnected')).toBeVisible()
    await page.click('[data-testid="start-timer-button"]')
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible()
    await page.waitForTimeout(3500)
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="start-timer-button"]')
    ).toBeVisible()
  })
})
