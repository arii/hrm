import { test, expect } from './fixtures'

test.describe('Stale HRM Tile', () => {
  test('should display visual indication when HRM data is stale', async ({
    page,
    mockHrm,
  }) => {
    await page.goto('/client/experimental')

    await mockHrm.connect('test-client-1')
    await mockHrm.sendData({
      value: 120,
      calories: 50,
    })

    const tile = page.getByTestId('hrm-tile-test-client-1')
    await expect(tile).toBeVisible()
    await expect(tile).toContainText('120')

    await page.waitForTimeout(6000)

    await expect(tile).toBeVisible()
  })
})
