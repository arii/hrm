// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 */
import { test, type Page, expect } from '@playwright/test'

const BASE_URL =
  process.env.BASE_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport size for screenshot comparisons
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Dashboard - main viewer page', async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL)

    // Wait for WebSocket connection and initial state
    await page.waitForSelector('text=/WORK:|Timer/', {
      timeout: 5000,
    })

    // Wait for layout to stabilize
    await page.waitForTimeout(1000)

    // Capture full-page screenshot
    await expect(page).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Control Panel - timer and music controls', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto(`${BASE_URL}/client/control`)

    // Wait for connection status
    await page.waitForSelector('text=/Timer Mode|Tabata/', { timeout: 5000 })

    // Wait for layout to stabilize
    await page.waitForTimeout(1000)

    // Capture screenshot
    await expect(page).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mock HRM Client - test data input', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto(`${BASE_URL}/client/mock`)

    // Wait for connection status
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    // Wait for layout to stabilize
    await page.waitForTimeout(1000)

    // Capture screenshot
    await expect(page).toHaveScreenshot('mock-hrm-client.png', {
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

  test('Dashboard with mock HR data streaming', async ({
    page,
  }: {
    page: Page
  }) => {
    // First send some mock HR data
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/Server Status/', { timeout: 5000 })

    // Set HR to yellow zone
    await page.fill('input[type="number"][value="100"]', '155')
    await page.click('button:has-text("Zone 4")')
    await page.waitForTimeout(500)

    // Navigate to dashboard to see HR data
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })
    await page.waitForTimeout(1000)

    // Capture screenshot with HR data displayed
    await expect(page).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

test.describe('Component Visual Tests', () => {
  test('HR Tiles - all zones', async ({ page }: { page: Page }) => {
    // First send some mock HR data to create tiles
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })
    
    // Send HR data to create a tile
    await page.fill('input[type="number"][value="100"]', '155')
    await page.click('button:has-text("Zone 4")')
    await page.waitForTimeout(500)
    
    // Now go to dashboard to see the tiles
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/Mock User/', { timeout: 5000 })

    // Find HR tile section
    const hrTilesSection = page.locator('[data-testid="hr-tile"]').first()
    await expect(hrTilesSection).toHaveScreenshot('hr-tiles-section.png', {
      animations: 'disabled',
    })
  })

  test('Timer Display - large format', async ({ page }: { page: Page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    // Find timer display component
    const timerDisplay = page.locator('[class*="TimerDisplay"]').first()

    if ((await timerDisplay.count()) > 0) {
      await expect(timerDisplay).toHaveScreenshot(
        'timer-display-component.png',
        {
          animations: 'disabled',
        }
      )
    }
  })
})
