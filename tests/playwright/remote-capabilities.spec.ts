import { test, expect } from '@playwright/test'
import {
  ClientCommandMessage,
  TimerCommandMessage,
} from '../../types/websocket'

/**
 * @fileoverview
 * This test file verifies the remote control capabilities of the application,
 * ensuring that the controller client can send commands to the server via WebSocket.
 */
test.describe('Remote Capabilities & Command Relay', () => {
  test('Controller sends commands via WebSocket', async ({ page }) => {
    // 1. Setup
    const commands: ClientCommandMessage[] = []
    const failedRequests: string[] = []

    // Intercept WebSocket messages
    page.on('websocket', (ws) => {
      ws.on('framesent', (event) => {
        if (event.payload) {
          commands.push(JSON.parse(event.payload.toString()))
        }
      })
    })

    // Intercept failed HTTP requests
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url())
    })

    // 2. Go to Controller Page
    await page.goto('http://127.0.0.1:3000/client/control')
    await expect(page.getByTestId('timer-mode-heading')).toBeVisible()
    await expect(page.locator('body')).toContainText('Server: Connected')

    // 3. Click Start Button
    const startButton = page.getByTestId('start-session-button')
    const stopButton = page.getByTestId('end-session-button')
    await expect(startButton).toBeVisible()
    await expect(stopButton).not.toBeVisible()
    await startButton.click()

    // 4. Verify UI Change on Controller
    // The button should now be a "STOP" button
    expect(failedRequests).toEqual([])
    await expect(stopButton).toBeVisible() // Wait for start button to appear
    await stopButton.click()
    // 5. Verify WebSocket Command
    await expect
      .poll(() => commands.length, { timeout: 5000 })
      .toBeGreaterThanOrEqual(2)

    const timerCommands = commands.filter(
      (c): c is TimerCommandMessage => c.type === 'TIMER_COMMAND'
    )
    const startCommand = timerCommands.find((c) => c.command === 'START')
    const stopCommand = timerCommands.find((c) => c.command === 'STOP')

    expect(startCommand).toBeDefined()
    expect(startCommand?.type).toBe('TIMER_COMMAND')
    expect(startCommand?.command).toBe('START')

    expect(stopCommand).toBeDefined()
    expect(stopCommand?.type).toBe('TIMER_COMMAND')
    expect(stopCommand?.command).toBe('STOP')
  })
})
