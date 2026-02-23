import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  setupVisualRegressionTest,
  mockMultipleHrDevices,
} from './test-helpers'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { waitForPageReady } from './lib/waits'

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

  test.afterEach(async () => {
    // Clear mock HR devices to prevent state pollution between tests
    await mockMultipleHrDevices(dashboardPage, [])
  })

  test.beforeEach(async () => {
    await waitForPageReady(dashboardPage)
  })

  test.describe('HR-Related Components', () => {
    test('dashboard with HR data', async () => {
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()

      // Assert HR tile height is within limits
      const hrTile = dashboardPage.getByTestId('hr-tile-card').first()
      await assertFixedDimensions(hrTile, {
        minHeight: 180,
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
    for (const zone of zones) {
      test(`dashboard with HR in Zone ${zone}`, async () => {
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
