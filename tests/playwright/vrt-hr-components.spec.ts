import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  setupVisualRegressionTest,
  mockMultipleHrDevices,
  prepareVrtEnvironment,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { HR_TILE_MIN_HEIGHT } from '../../constants/layout'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let mockPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
    mockPage = setup.mockPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test.beforeEach(async ({ request }) => {
    await prepareVrtEnvironment(request, [dashboardPage, mockPage])

    // Ensure the mock athlete is registered and visible on the dashboard
    // This prevents race conditions where the dashboard is connected but hasn't received the first athlete data yet.
    await expect(dashboardPage.getByTestId('hr-tile-card').first()).toBeVisible(
      {
        timeout: 10000,
      }
    )
  })

  test.afterEach(async () => {
    // Clear mock HR devices to prevent state pollution between tests
    await mockMultipleHrDevices(dashboardPage, [])
  })

  test.describe('HR-Related Components', () => {
    // Reset devices after each test to prevent state pollution
    test.afterEach(async () => {
      await mockMultipleHrDevices(dashboardPage, [])
      await expect(dashboardPage.getByTestId('hr-tile-card')).toHaveCount(0)
    })

    test('dashboard with HR data', async () => {
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()

      // Wait for HR tile to appear
      await expect(
        dashboardPage.getByTestId('hr-tile-card').first()
      ).toBeVisible()

      // Assert HR tile height is within limits
      const hrTile = dashboardPage.getByTestId('hr-tile-card').first()

      // Assert HR tile height is within limits
      await assertFixedDimensions(hrTile, {
        minHeight: HR_TILE_MIN_HEIGHT,
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

    // NEW: Multiple connected devices
    test('dashboard with 2 HR devices', async () => {
      await mockMultipleHrDevices(dashboardPage, [
        {
          clientId: 'user-1',
          name: 'User One',
          value: 145,
          maxHr: 185,
          calories: 300,
          zone: 'ZONE_3',
        },
        {
          clientId: 'user-2',
          name: 'User Two',
          value: 165,
          maxHr: 190,
          calories: 450,
          zone: 'ZONE_4',
        },
      ])

      // Wait for tiles to appear and reflect mock data
      await expect(dashboardPage.getByTestId('hr-tile-card')).toHaveCount(2, {
        timeout: 5000,
      })

      const hrTiles = dashboardPage.getByTestId('hr-tile-card')
      await expect(hrTiles.first()).toBeVisible()
      await expect(hrTiles.nth(1)).toBeVisible()

      // Assert all HR tiles maintain dimensions
      const count = await hrTiles.count()
      for (let i = 0; i < count; i++) {
        await assertFixedDimensions(hrTiles.nth(i), {
          minHeight: HR_TILE_MIN_HEIGHT,
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

    // NEW: HR device in different zones
    const zones = [0, 1, 2, 3, 4, 5, 6]
    const zoneBpms = [65, 95, 115, 135, 155, 175, 195]
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const expectedBpm = zoneBpms[i]
      test(`dashboard with HR in Zone ${zone}`, async () => {
        await mockPage.getByRole('button', { name: `Zone ${zone}` }).click()

        // Wait for the dashboard to reflect the new BPM value and zone color
        const firstHrTile = dashboardPage.getByTestId('hr-tile-card').first()
        await expect(firstHrTile.getByTestId('bpm-value')).toHaveText(
          new RegExp(`^${expectedBpm}`),
          { timeout: 5000 }
        )

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

    // NEW: Disconnected state
    test('dashboard with disconnected HR device', async () => {
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
