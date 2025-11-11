// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 */
import { test, expect } from './fixtures'
import { type Page } from '@playwright/test'
import { setupVisualRegressionTest, BASE_URL } from './test-helpers'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(setupVisualRegressionTest)

  test('Dashboard - main viewer page', async ({ dashboardPage }) => {
    // Capture full-page screenshot
    await expect(dashboardPage).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.2, // Allow for minor rendering differences
    })
  })

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
    await page.waitForTimeout(500)

    // Now navigate to dashboard to see active timer
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK|REST/', { timeout: 3000 })
    await page.waitForTimeout(500)

    // Capture screenshot with running timer
    await expect(page).toHaveScreenshot('dashboard-active-timer.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('text=/\\d+s/')],
    })
  })

  test('Dashboard with mock HR data streaming', async ({ mockPage, dashboardPage }) => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await mockPage.waitForTimeout(500)

    // Dashboard page already loaded via fixture
    await dashboardPage.waitForSelector('text=Mock User', { timeout: 5000 })
    await dashboardPage.waitForTimeout(1000)
    
    // Capture screenshot with HR data displayed
    await expect(dashboardPage).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

test.describe('Component Visual Tests', () => {
  test.beforeEach(setupVisualRegressionTest)

  test('HR Tiles - all zones', async ({ mockPage, dashboardPage }) => {
    // Set HR zone first, then start streaming
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await mockPage.click('button:has-text("START")')
    await mockPage.waitForTimeout(1000)

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
    const timerDisplay = dashboardPage.locator('[class*="TimerDisplay"]').first()
    await expect(timerDisplay).toHaveScreenshot('timer-display-component.png', {
      animations: 'disabled',
    })
  })
})
