import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupVisualRegressionTest,
  mockMultipleHrDevices,
  resetServerState,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'
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
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Reload pages to ensure clean client state and fresh WebSocket connection
    await dashboardPage.reload()
    await mockPage.reload()

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
        maxDiffPixelRatio: 0.15,
        mask: [...getDynamicContentMasks(dashboardPage)],
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

      // Wait for HR tiles to appear
      const hrTiles = dashboardPage.getByTestId('hr-tile-card')
      await expect(hrTiles).toHaveCount(2)
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
        maxDiffPixelRatio: 0.15,
        mask: [...getDynamicContentMasks(dashboardPage)],
      })
    })

    // NEW: HR device in representative zones (Idle, Middle, Max)
    const zones = [0, 3, 6]
    for (const zone of zones) {
      test(`dashboard with HR in Zone ${zone}`, async () => {
        // Enforce explicit viewport to ensure stable geometry across runs
        await dashboardPage.setViewportSize({ width: 1920, height: 1080 })

        await mockPage.getByLabel('Current BPM').fill(String(60 + zone * 20))
        await mockPage.getByRole('button', { name: `Zone ${zone}` }).click()

        // Wait for HR tile to appear
        await expect(
          dashboardPage.getByTestId('hr-tile-card').first()
        ).toBeVisible()

        const dashboard = dashboardPage.getByTestId('dashboard')
        await takeScreenshot(dashboard, `dashboard-hr-zone-${zone}.png`, {
          maxDiffPixelRatio: 0.1,
          mask: [...getDynamicContentMasks(dashboardPage)],
        })
      })
    }

    // NEW: Disconnected state
    test('dashboard with disconnected HR device', async () => {
      await mockMultipleHrDevices(dashboardPage, [])
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-hr-disconnected.png', {
        maxDiffPixelRatio: 0.1,
        mask: [...getDynamicContentMasks(dashboardPage)],
      })
    })
  })
})
