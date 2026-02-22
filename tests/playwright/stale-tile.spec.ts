import { test, expect } from '@playwright/test'
import { ServerMessage } from '../../types/websocket'

test('should remove tile immediately when missing from HRM_UPDATE', async ({
  page,
}) => {
  await page.goto('/?testing=true')
<<<<<<< HEAD
  await page.waitForSelector('main, body > div', {
    state: 'visible',
    timeout: 15000,
  })
=======
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 })
>>>>>>> origin/leader

  // Helper to dispatch messages to the reducer
  const dispatch = async (message: ServerMessage | { type: 'RESET_STATE' }) => {
    await page.waitForFunction(() => window.__TEST_CONTROLS__?.dispatch, {
      timeout: 10000,
    })
    await page.evaluate((msg) => {
      const win = window as unknown as {
        __TEST_CONTROLS__: {
          dispatch: (m: unknown) => void
        }
      }
      const controls = win.__TEST_CONTROLS__
      if (controls && typeof controls.dispatch === 'function') {
        controls.dispatch(msg)
      } else {
        throw new Error('__TEST_CONTROLS__.dispatch not found')
      }
    }, message)
  }

  // 1. Simulate active data
  await dispatch({
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: 'test-1',
        value: 75,
        name: 'test-1',
        age: 30,
        maxHr: 190,
        restingHr: 60,
        zone: 'warmup',
        calories: 10,
      },
    ],
  })
  await expect(page.locator('text=test-1')).toBeVisible()

  // 2. Send update without the user
  await dispatch({
    type: 'HRM_UPDATE',
    payload: [],
  })

  // 3. Assert immediate removal
  await expect(page.locator('text=test-1')).not.toBeVisible()
})
