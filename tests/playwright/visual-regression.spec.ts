// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 */
import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  BASE_URL,
  setupMinimalVisualRegressionTest,
  setupVisualRegressionTest,
} from './test-helpers'

test.describe('Visual Regression Tests', () => {
  test('Dashboard - main viewer page', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage)
    // Capture full-page screenshot
    await expect(dashboardPage).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.2, // Allow for minor rendering differences
    })
  })

  test.beforeEach(setupVisualRegressionTest)

  test('Control Panel - timer and music controls', async ({ controlPage }) => {
    // Capture screenshot
    await expect(controlPage).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mock HRM Client - test data input', async ({ mockPage }) => {
    // Capture screenshot
    await expect(mockPage).toHaveScreenshot('mock-hrm-client.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test.skip('Dashboard with active timer', async ({ page }: { page: Page }) => {
    // First navigate to control panel
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode|Tabata/', { timeout: 5000 })

    // Configure timer (20s work, 10s rest)
    await page.fill('input[aria-label="Work duration in seconds"]', '20')
    await page.fill('input[aria-label="Rest duration in seconds"]', '10')

    // Start timer
    await page.click('button:has-text("START")', { force: true })
    await expect(page.locator('button:has-text("STOP")')).toBeVisible()

    // Now navigate to dashboard to see active timer
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK|REST/')).toBeVisible()

    // Capture screenshot with running timer
    await expect(page).toHaveScreenshot('dashboard-active-timer.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('text=/\\d+s/')],
    })
  })

  test('Dashboard with mock HR data streaming', async ({
    mockPage,
    dashboardPage,
  }) => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await expect(mockPage.getByLabel('Current BPM')).toHaveValue('155')

    // Dashboard page already loaded via fixture
    await expect(dashboardPage.locator('text=Mock User')).toBeVisible()

    const primaryTile = dashboardPage
      .locator('[data-testid="hr-tile-grid-item"]')
      .first()

    // Capture screenshot with HR data displayed while masking dynamic numbers
    await expect(dashboardPage).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [primaryTile.getByText(/\d+%/), primaryTile.getByText(/\d+\s*BPM/)],
    })
  })
})

test.describe('Component Visual Tests', () => {
  test.beforeEach(setupVisualRegressionTest)

  test('HR Tiles - all zones', async ({ mockPage, dashboardPage }) => {
    // Set HR zone first, then start streaming
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await mockPage.click('button:has-text("START")')
    await expect(
      mockPage.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Wait for HR tiles to load on dashboard
    await dashboardPage.waitForSelector('[data-testid="hr-tile-grid-item"]', {
      timeout: 8000,
    })

    const firstTile = dashboardPage
      .locator('[data-testid="hr-tile-grid-item"]')
      .first()
    await expect(firstTile).toHaveScreenshot('hr-tiles-section.png', {
      animations: 'disabled',
    })
  })

  test('Timer Display - large format', async ({ dashboardPage }) => {
    const timerDisplay = dashboardPage
      .locator('[class*="TimerDisplay"]')
      .first()
    await expect(timerDisplay).toHaveScreenshot('timer-display-component.png', {
      animations: 'disabled',
    })
  })
})
