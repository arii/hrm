import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  mockMultipleHrDevices,
  resetServerState,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { HR_TILE_MIN_HEIGHT } from '../../constants/layout'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ dashboardPage, mockPage, request }) => {
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Navigate to required routes
    await dashboardPage.goto('/')
    await mockPage.goto('/client/mock')

    // 3. Wait for pages to be ready and connected
    await waitForPageReady(dashboardPage)
    await waitForPageReady(mockPage)

    await dashboardPage.waitForFunction(
      () => document.body.dataset.connectionStatus === 'connected',
      { timeout: 5000 }
    )
    await mockPage.waitForFunction(
      () => document.body.dataset.connectionStatus === 'connected',
      { timeout: 5000 }
    )
  })

  test.describe('HR-Related Components', () => {
    test('dashboard with HR data', async ({ dashboardPage, mockPage }) => {
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
    test('dashboard with 2 HR devices', async ({ dashboardPage }) => {
      const expectedCount = 2

      // Disconnect from server to prevent background updates (like "Mock User") from interfering
      await dashboardPage.evaluate(() => {
        window.__TEST_CONTROLS__?.disconnect?.()
      })

      // Wait for disconnection to be processed (which resets state) to avoid race conditions
      // where the mock data is cleared by the disconnection logic immediately after being set.
      await dashboardPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'disconnected'
      )

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

      // Explicitly wait for the correct number of tiles to prevent race conditions
      const hrTiles = dashboardPage.getByTestId('hr-tile-card')
      await expect(hrTiles).toHaveCount(expectedCount, { timeout: 5000 })

      // Assert all HR tiles maintain dimensions
      for (let i = 0; i < expectedCount; i++) {
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

    // NEW: HR device in representative zones (Idle, Middle, Max)
    const zones = [0, 3, 6]
    for (const zone of zones) {
      test(`dashboard with HR in Zone ${zone}`, async ({
        dashboardPage,
        mockPage,
      }) => {
        await mockPage.getByLabel('Current BPM').fill(String(60 + zone * 20))
        await mockPage.getByRole('button', { name: `Zone ${zone}` }).click()

        // Wait for HR tile to reflect the update and be stable
        const hrTile = dashboardPage.getByTestId('hr-tile-card').first()
        await hrTile.waitFor({ state: 'visible', timeout: 5000 })

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
    test('dashboard with disconnected HR device', async ({ dashboardPage }) => {
      await mockMultipleHrDevices(dashboardPage, [])
      // Ensure no tiles are present
      await expect(dashboardPage.getByTestId('hr-tile-card')).toHaveCount(0, {
        timeout: 5000,
      })

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
