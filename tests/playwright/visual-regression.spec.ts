// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 *
 * KNOWN ISSUE: These tests can be flaky due to incomplete server state cleanup.
 * The timer state from previous test runs may persist on the server, causing the
 * first test to capture a screenshot with an active timer instead of the idle state.
 *
 * TODO: Implement proper server state reset endpoint or mechanism to ensure clean
 * server state before tests start. This would eliminate the flakiness by guaranteeing
 * all WebSocket clients and server-side timer state are fully reset.
 */
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  BASE_URL,
  replaceIframeWithStableWorkout,
  waitForPageReady,
} from './test-helpers'

// Configure tests to run serially for better performance
test.describe.configure({ mode: 'serial' })

// Persistent pages for reuse across tests
let dashboardPage: Page
let controlPage: Page
let mockPage: Page
let context: BrowserContext

test.describe('Visual Regression Tests', () => {
  // Set up all pages once before all tests
  test.beforeAll(async ({ browser }) => {
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
      if (await stopButton.isVisible({ timeout: 1000 })) {
        await stopButton.click()
        // Wait for START button to confirm timer stopped on control page
        await expect(
          controlPage.getByRole('button', { name: 'START', exact: true })
        ).toBeVisible({ timeout: 3000 })

        // Wait for dashboard to clear timer display (return to READY state)
        await expect(dashboardPage.locator('text=READY')).toBeVisible({
          timeout: 3000,
        })
      }
    } catch {
      // Timer not running, continue
    }

    // Replace iframe with stable content for dashboard
    await replaceIframeWithStableWorkout(dashboardPage)
  })

  // Clean up after all tests
  test.afterAll(async () => {
    await context.close()
  })

  test('Dashboard - main viewer page', async () => {
    // Capture full-page screenshot
    await expect(dashboardPage).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.2, // Allow for minor rendering differences
    })
  })

  test('Control Panel - timer and music controls', async () => {
    // Capture screenshot
    await expect(controlPage).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mock HRM Client - test data input', async () => {
    // Capture screenshot
    await expect(mockPage).toHaveScreenshot('mock-hrm-client.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Dashboard with active timer', async () => {
    // Wait for control page to be fully loaded - check for Timer Mode text
    await expect(controlPage.getByText('Timer Mode')).toBeVisible({
      timeout: 5000,
    })

    // Ensure control panel inputs are visible
    // 1. Get the locator for the input using its test ID
    const workInput = controlPage.getByTestId('work-duration-input')

    const restInput = controlPage.getByTestId('rest-duration-input')

    // 2. (Recommended) Wait for it to be visible
    // This ensures the component has rendered before you try to fill it.
    await expect(workInput).toBeVisible({ timeout: 5000 })
    await expect(restInput).toBeVisible({ timeout: 5000 })

    // Configure timer (15 work, 5s rest)
    await workInput.fill('15')
    await restInput.fill('5')

    // Start timer

    await controlPage.click('button:has-text("START")', { force: true })

    // wait for braodcast messages to propagate
    // Use the recommended, specific locator
    const stopButton = controlPage.getByRole('button', {
      name: 'STOP',
      exact: true,
    })

    // Use this specific locator in your assertion
    await expect(stopButton).toBeVisible()

    // Wait for timer to appear on dashboard
    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
      timeout: 10000,
    })

    // Capture screenshot with running timer - mask dynamic timer numbers
    await expect(dashboardPage).toHaveScreenshot('dashboard-active-timer.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        // Mask the large timer countdown numbers (e.g., "04", "03")
        dashboardPage.locator('text=/^\\d+$/'),
        // Mask any time displays with seconds (e.g., "15s", "5s")
        dashboardPage.locator('text=/\\d+s/'),
      ],
    })
  })

  test('Dashboard with mock HR data streaming', async () => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await expect(mockPage.getByLabel('Current BPM')).toHaveValue('155')

    // Dashboard page already loaded via fixture
    await expect(dashboardPage.locator('text=Mock User')).toBeVisible()

    // Get all HR tiles to mask dynamic content
    const hrTiles = dashboardPage.locator('[data-testid="hr-tile-grid-item"]')

    // Capture screenshot with HR data displayed while masking dynamic numbers
    await expect(dashboardPage).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        // Mask the timer countdown numbers (from previous test)
        dashboardPage.locator('text=/^\\d+$/'),
        // Mask time displays with seconds
        dashboardPage.locator('text=/\\d+s/'),
        // Mask all percentage and BPM numbers in all HR tiles
        hrTiles.getByText(/\d+%/),
        hrTiles.getByText(/\d+\s*BPM/),
      ],
    })
  })

  test('HR Tiles - all zones', async () => {
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
})
