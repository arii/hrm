// tests/playwright/stale-tile.spec.ts
import { test, expect } from '@playwright/test'

test('should remove tile after 60 seconds of inactivity', async ({ page }) => {
  await page.goto('/')

  // Wait for the test controls to be available on the window object
  await page.waitForFunction(() => window.__TEST_CONTROLS__)

  // 1. Simulate active data
  await page.evaluate(() => {
    window.__TEST_CONTROLS__.dispatch({
      type: 'INITIAL_STATE',
      payload: {
        hrmData: [
          {
            clientId: 'test-1',
            name: 'new user',
            value: 75,
            maxHr: 180,
            age: 30,
            calories: 10,
          },
        ],
      },
    })
  })

  // 2. Assert the tile is visible
  await expect(page.getByTestId('hr-tile-test-1')).toBeVisible()

  // 3. Update the name
  await page.evaluate(() => {
    window.__TEST_CONTROLS__.dispatch({
      type: 'HRM_METADATA_UPDATE',
      data: {
        clientId: 'test-1',
        name: 'Tester',
      },
    })
  })

  // 4. Assert the name is updated
  await expect(page.getByTestId('hr-tile-test-1')).toContainText('Tester')

  // 3. Wait for the tile to become stale and be removed
  await page.waitForTimeout(65000) // Wait > 60 seconds for removal

  // 4. Assert removal
  await expect(page.getByTestId('hr-tile-test-1')).not.toBeVisible()
})
