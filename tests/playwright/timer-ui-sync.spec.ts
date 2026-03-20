import { test, expect, Page } from '@playwright/test'
import { ServerMessage } from '../../types/websocket'

// Helper function to dispatch a WebSocket message from the client-side
const dispatchServerMessage = async (page: Page, message: ServerMessage) => {
  await page.waitForFunction(() => window.__TEST_CONTROLS__?.dispatch)
  return page.evaluate((msg: ServerMessage) => {
    const dispatch = (
      window as Window & {
        __TEST_CONTROLS__?: { dispatch: (message: ServerMessage) => void }
      }
    ).__TEST_CONTROLS__?.dispatch
    if (dispatch) {
      dispatch(msg)
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
    const disconnect = (
      window as Window & { __TEST_CONTROLS__?: { disconnect: () => void } }
    ).__TEST_CONTROLS__?.disconnect
    if (disconnect) {
      disconnect()
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
    const startButton = page.locator('[data-testid="start-timer-button"]')

    // Wait for either the start or stop button to appear to ensure UI is ready.
    // This prevents unnecessarily polling for 2 seconds when the timer is already stopped.
    await expect(startButton.or(stopButton)).toBeVisible({ timeout: 2000 })

    if (await stopButton.isVisible()) {
      await stopButton.click()
    }

    // Wait until the start button is visible and enabled before continuing with the test.
    await expect(startButton).toBeEnabled({ timeout: 10000 })
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
    await page.waitForTimeout(500)
    await dispatchServerMessage(page, {
      type: 'TIMER_UPDATE',
      payload: {
        isRunning: true,
        currentPhase: 'WORK',
        timeRemaining: 30,
        timeElapsed: 0,
        caloriesBurned: 0,
        mode: 'STOPWATCH',
        workDuration: 30,
        restDuration: 0,
        soundEventId: 0,
      },
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
    await page.waitForTimeout(500)
    await dispatchServerMessage(page, {
      type: 'TIMER_UPDATE',
      payload: {
        isRunning: false,
        currentPhase: 'IDLE',
        timeRemaining: 0,
        timeElapsed: 0,
        caloriesBurned: 0,
        mode: 'STOPWATCH',
        workDuration: 0,
        restDuration: 0,
        soundEventId: 0,
      },
    })
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="start-timer-button"]')
    ).toBeVisible()
  })
})
