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
<<<<<<< HEAD
  test('Dashboard - main viewer page', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage)
    // Capture full-page screenshot
=======
  // Set up all pages once before all tests
  test.beforeAll(async ({ browser }) => {
    // Increase timeout for setup to handle parallel page loads and potential server slowness
    test.setTimeout(60000)

    context = await browser.newContext({
      // Start with a clean session - no cookies, cache, or storage
      storageState: undefined,
    })

    // Create all pages in parallel
    ;[dashboardPage, controlPage, mockPage] = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ])

    // Navigate all pages in parallel
    await Promise.all([
      dashboardPage.goto(BASE_URL),
      controlPage.goto(`${BASE_URL}/client/control`),
      mockPage.goto(`${BASE_URL}/client/mock`),
    ])

    // Wait for all pages to be ready in parallel
    await Promise.all([
      waitForPageReady(dashboardPage),
      waitForPageReady(controlPage),
      waitForPageReady(mockPage),
    ])

    // Ensure timer is stopped before tests start
    // Check if STOP button exists (timer is running)
    const stopButton = controlPage.getByRole('button', {
      name: 'STOP',
      exact: true,
    })

    try {
      // If timer is running, stop it
      if (await stopButton.isVisible({ timeout: 2000 })) {
        await stopButton.click()
        // Wait for START button to confirm timer stopped on control page
        await expect(
          controlPage.getByRole('button', { name: 'START', exact: true })
        ).toBeVisible({ timeout: 5000 })

        // Wait for dashboard to clear timer display (return to READY state)
        await expect(dashboardPage.locator('text=READY')).toBeVisible({
          timeout: 5000,
        })
      }
    } catch (error) {
      // Timer not running or failed to stop, log and continue
      console.warn('Timer check/stop encountered an issue (ignoring):', error)
    }

    // Replace iframe with stable content for dashboard
    // Adding a timeout to prevent indefinite hanging if iframe is missing
    try {
      // Wait a moment for dashboard to settle before replacing
      await dashboardPage.waitForTimeout(1000)
      await replaceIframeWithStableWorkout(dashboardPage)
    } catch (e) {
      console.warn(
        'Failed to replace iframe (it might be missing or slow to load):',
        e
      )
    }
  })

  // Clean up after all tests
  test.afterAll(async () => {
    if (context) {
      await context.close()
    }
  })

  test('Dashboard - main viewer page', async () => {
    // Extra verification: ensure timer is NOT in active state (no WORK/REST)
    // Wait for any existing timer display to settle or disappear
    try {
      await expect(dashboardPage.locator('text=/WORK|REST/')).not.toBeVisible({
        timeout: 3000,
      })
    } catch {
      // Timer might already be idle, continue
    }

    // Wait a bit for any animations to settle
    await dashboardPage.waitForTimeout(1000)

    // Capture full-page screenshot - mask timer numbers in case cleanup didn't work
>>>>>>> origin/leader
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
    mockPage,
    dashboardPage,
  }) => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await mockPage.waitForTimeout(500)

    // Dashboard page already loaded via fixture
    await dashboardPage.waitForSelector('text=Mock User', { timeout: 5000 })
    await dashboardPage.waitForTimeout(1000)

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
    const timerDisplay = dashboardPage
      .locator('[class*="TimerDisplay"]')
      .first()
    await expect(timerDisplay).toHaveScreenshot('timer-display-component.png', {
      animations: 'disabled',
    })
  })
})
