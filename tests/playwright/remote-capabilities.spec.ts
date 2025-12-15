// File: tests/playwright/remote-capabilities.spec.ts
import { test, expect } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE_URL = getBaseURL()

test.describe('Remote Capabilities & Command Relay', () => {
  test('Controller sends commands via WebSocket', async ({ page }) => {
    // 1. Setup Network & WS capture
    const failedRequests: string[] = []
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/spotify'))
        failedRequests.push(request.url())
    })

    const sentMessages: unknown[] = []
    page.on('websocket', (ws) => {
      ws.on('framesent', (frame) => {
        try {
          sentMessages.push(JSON.parse(frame.payload as string))
        } catch {
          /* empty */
        }
      })
    })

    // 2. Navigate and Wait for Component
    await page.goto(`${BASE_URL}/client/control`)

    // Wait for both components to be ready
    await expect(page.getByTestId('spotify-controls-card')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByTestId('timer-mode-heading')).toBeVisible({
      timeout: 10000,
    })

    // 3. Verify GET_DEVICES
    await expect
      .poll(() => sentMessages, { timeout: 10000 })
      .toContainEqual(
        expect.objectContaining({
          type: 'SPOTIFY_COMMAND',
          command: 'GET_DEVICES',
        })
      )

    // 4. Test Interaction: Ensure timer is stopped, then start it.
    const endSessionButton = page.getByTestId('end-session-button')
    if (await endSessionButton.isVisible()) {
      await endSessionButton.click()
    }

    const startSessionButton = page.getByTestId('start-session-button')
    await expect(startSessionButton).toBeVisible() // Wait for start button to appear
    await startSessionButton.click()

    // 5. Verify WebSocket Command
    await expect
      .poll(() => sentMessages)
      .toContainEqual(
        expect.objectContaining({
          type: 'SPOTIFY_COMMAND',
          command: 'NEXT',
        })
      )

    expect(failedRequests).toEqual([])
    await expect(endSessionButton).toBeVisible() // Wait for end button to appear
    await endSessionButton.click()
    // 5. Verify WebSocket Command
    await expect
      .poll(() => sentMessages)
      .toContainEqual(
        expect.objectContaining({
          type: 'SPOTIFY_COMMAND',
          command: 'PAUSE',
        })
      )
  })
})
