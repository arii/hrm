import { test, expect } from '@playwright/test'
import { ServerMessage } from '../../types/websocket'

test('should remove tile immediately when missing from HRM_UPDATE', async ({
  page,
}) => {
  await page.goto('/')

  const dispatch = async (message: ServerMessage | { type: 'RESET_STATE' }) => {
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

  await dispatch({
    type: 'HRM_UPDATE',
    payload: [],
  })

  await expect(page.locator('text=test-1')).not.toBeVisible()
})
