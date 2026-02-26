import { test, expect } from '@playwright/test'

test('should handle clock skew correctly', async ({ page }) => {
  // Use a long timeout for the initial load and build
  await page.goto('/?testing=true')
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30000 })

  // Helper to dispatch messages to the reducer
  const dispatch = async (message: unknown) => {
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            TEST_CONTROLS?: { dispatch: (m: unknown) => void }
          }
        ).TEST_CONTROLS?.dispatch,
      {
        timeout: 10000,
      }
    )
    await page.evaluate((msg) => {
      ;(
        window as unknown as {
          TEST_CONTROLS: { dispatch: (m: unknown) => void }
        }
      ).TEST_CONTROLS.dispatch(msg)
    }, message)
  }

  // 1. Mock client time to be 60 seconds ahead of "server time"
  // We'll use a fixed "now" for the client.
  const baseTime = Date.now()
  const clientNow = baseTime + 60000

  await page.evaluate((now) => {
    ;(window as unknown as { __MOCKED_NOW__: number }).__MOCKED_NOW__ = now
    ;(window as unknown as { Date: { now: () => number } }).Date.now = () =>
      (window as unknown as { __MOCKED_NOW__: number }).__MOCKED_NOW__
    // Also need to trigger a re-render or wait for the next useNow tick
    // But since we are dispatching a new message, it should trigger a re-render anyway.
  }, clientNow)

  // 2. Dispatch HRM_UPDATE with "server time" (baseTime)
  // This data is 60 seconds old according to the mocked client clock.
  // The threshold is 30 seconds, so it SHOULD be filtered out WITHOUT the fix.
  await dispatch({
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: 'skew-test',
        value: 80,
        name: 'Skew Test',
        age: 30,
        updatedAt: baseTime, // server time
      },
    ],
  })

  // 3. Assert the tile is NOT visible (because it's "stale")
  // We wait a bit to ensure the reducer processed it and the UI updated.
  await page.waitForTimeout(1000)
  const tile = page.locator('text=Skew Test')
  await expect(tile).not.toBeVisible()

  // 4. Now simulate receiving the same message but WITH a serverTimestamp (the fix)
  // We'll use baseTime as the serverTimestamp.
  await dispatch({
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: 'skew-test',
        value: 80,
        name: 'Skew Test',
        age: 30,
        updatedAt: baseTime,
      },
    ],
    serverTimestamp: baseTime,
  })

  // 5. Assert the tile IS visible (because the reducer compensated for the skew)
  await expect(tile).toBeVisible()
})
