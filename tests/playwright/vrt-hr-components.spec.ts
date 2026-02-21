// tests/playwright/vrt-hr-components.spec.ts
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  setupMinimalVisualRegressionTest,
  mockMultipleHrDevices,
  resetServerState,
} from './test-helpers'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'

// Test suite for VRT
test.describe('Visual Regression Tests - HR Components', () => {
  test.afterEach(async ({ page }) => {
    // Reset server state after each test
    await resetServerState(page)
  })

  test.describe('HR-Related Components', () => {
    test('dashboard with HR data', async ({ dashboardPage, mockPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(mockPage, '/client/mock')

      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()

      // Assert HR tile height is within limits
      const hrTile = dashboardPage.getByTestId('hr-tile-card').first()
      await assertFixedDimensions(hrTile, {
        minHeight: 180,
        maxHeight: 250,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')

      await takeScreenshot(dashboard, 'dashboard-with-hr-data.png', {
        maxDiffPixelRatio: 0.1,
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })

    test('dashboard with 2 HR devices', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')

      await mockMultipleHrDevices(dashboardPage, [
        {
          clientId: 'user-1',
          name: 'User One',
          value: 145,
          maxHr: 185,
          calories: 300,
          zone: 'Zone 3',
        },
        {
          clientId: 'user-2',
          name: 'User Two',
          value: 165,
          maxHr: 190,
          calories: 450,
          zone: 'Zone 4',
        },
      ])

      // Assert all HR tiles maintain dimensions
      const hrTiles = dashboardPage.getByTestId('hr-tile-card')
      const count = await hrTiles.count()
      for (let i = 0; i < count; i++) {
        await assertFixedDimensions(hrTiles.nth(i), {
          minHeight: 180,
          maxHeight: 250,
        })
      }

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-with-2-hr-devices.png', {
        maxDiffPixelRatio: 0.1,
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })

    const zones = [0, 1, 2, 3, 4, 5, 6]
    for (const zone of zones) {
      test(`dashboard with HR in Zone ${zone}`, async ({
        dashboardPage,
        mockPage,
      }) => {
        await setupMinimalVisualRegressionTest(dashboardPage, '/')
        await setupMinimalVisualRegressionTest(mockPage, '/client/mock')

        await mockPage.getByLabel('Current BPM').fill(String(60 + zone * 20))
        await mockPage.getByRole('button', { name: `Zone ${zone}` }).click()

        const dashboard = dashboardPage.getByTestId('dashboard')
        await takeScreenshot(dashboard, `dashboard-hr-zone-${zone}.png`, {
          maxDiffPixelRatio: 0.1,
          mask: [
            ...getDynamicContentMasks(dashboardPage),
            ...getHrMasks(dashboardPage),
          ],
        })
      })
    }

    test('dashboard with disconnected HR device', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await mockMultipleHrDevices(dashboardPage, [])
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-hr-disconnected.png', {
        maxDiffPixelRatio: 0.1,
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })
  })
})
