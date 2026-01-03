// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 *
 * DETERMINISTIC CAPTURE STRATEGY:
 * - Network and DOM idle synchronization before snapshots
 * - Font loading guarantees for consistent rendering
 * - Precise masking of dynamic content using data-testid selectors
 * - Element isolation for scoped component screenshots
 */
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  setupVisualRegressionTest,
} from './test-helpers'
import { takeDashboardScreenshot, takeScreenshot } from './lib/visual'
import { WAIT_TIMEOUTS } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let controlPage: Page
let mockPage: Page
let context: BrowserContext

// Test suite for Visual Regression
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
    controlPage = setup.controlPage
    mockPage = setup.mockPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  // Test cases
  test('Dashboard - main viewer page', async () => {
    await takeDashboardScreenshot(dashboardPage, 'dashboard-viewer.png')
  })

  test('Control Panel - timer and music controls', async () => {
    await takeScreenshot(controlPage, 'control-panel.png')
  })

  test('Mock HRM Client - test data input', async () => {
    await takeScreenshot(mockPage, 'mock-hrm-client.png')
  })

  test('Dashboard with active timer', async () => {
    const decreaseWorkButton = controlPage.getByRole('button', {
      name: /Decrease Work Duration/i,
    })
    const decreaseRestButton = controlPage.getByRole('button', {
      name: /Decrease Rest Duration/i,
    })

    await decreaseWorkButton.click() // Default 20 -> 15
    await decreaseRestButton.click() // Default 10 -> 5
    await controlPage.click('button:has-text("START")', { force: true })

    await expect(
      controlPage.getByRole('button', { name: 'STOP', exact: true })
    ).toBeVisible()
    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
      timeout: WAIT_TIMEOUTS.INFRASTRUCTURE,
    })

    await takeScreenshot(dashboardPage, 'dashboard-active-timer.png', {
      mask: getTimerMasks(dashboardPage),
    })
  })

  test('Dashboard with mock HR data streaming', async () => {
    // Set user count to 1 for a single user stream
    await mockPage.locator('[data-testid="user-count-input"]').fill('1');
    await mockPage.locator('[data-testid="streaming-start-button"]').click();
    // Wait for at least one HR tile to be rendered
    await expect(dashboardPage.locator('[data-testid^="hr-tile-"]')).toHaveCount(1, { timeout: 15000 });

    await takeScreenshot(dashboardPage, 'dashboard-with-hr-data.png', {
      maxDiffPixelRatio: 0.04,
      mask: [
        ...getDynamicContentMasks(dashboardPage),
        ...getHrMasks(dashboardPage),
      ],
    });
  });

  test('HR Tiles - all zones', async () => {
    // Stop any previous stream
    await mockPage.locator('[data-testid="streaming-stop-button"]').click();
    // Start a new single-user stream
    await mockPage.locator('[data-testid="user-count-input"]').fill('1');
    await mockPage.locator('[data-testid="streaming-start-button"]').click();


    await dashboardPage.waitForSelector('[data-testid="hr-tile-grid-item"]', {
      timeout: WAIT_TIMEOUTS.LONG,
    });

    const firstTile = dashboardPage
      .locator('[data-testid="hr-tile-grid-item"]')
      .first()
    await takeScreenshot(firstTile, 'hr-tiles-section.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        firstTile.locator('[data-testid="live-hr-value"]'),
        firstTile.locator('[data-testid="live-hr-percent"]'),
      ],
    })
  })
})
