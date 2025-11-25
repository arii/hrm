// File: tests/playwright/core-functionality.spec.ts
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

test.describe('HRM Core Functionality', () => {
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
        await expect(dashboardPage.locator('text=00:00')).toBeVisible({
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

  test('Dashboard - main interface', async () => {
    await expect(dashboardPage).toHaveScreenshot('dashboard-main.png')
  })

  test('Dashboard - with HR data streaming', async () => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await expect(mockPage.getByLabel('Current BPM')).toHaveValue('155')

    // Dashboard page already loaded via fixture
    await expect(dashboardPage.locator('text=Mock User')).toBeVisible()

    await expect(dashboardPage).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      mask: [
        dashboardPage.locator('text=/^\\d+$/'),
        dashboardPage.locator('text=/\\d+s/'),
        dashboardPage.locator('text=/WORK|REST|READY|RUNNING/'),
        dashboardPage.locator('[data-testid="hr-tile-grid-item"]'),
      ],
    })
  })

  test('Control panel - timer configuration', async () => {
    await expect(controlPage).toHaveScreenshot('control-panel.png')
  })

  test('Control panel - active workout', async () => {
    const workInput = controlPage.getByTestId('work-duration-input')
    const restInput = controlPage.getByTestId('rest-duration-input')

    await expect(workInput).toBeVisible({ timeout: 5000 })
    await expect(restInput).toBeVisible({ timeout: 5000 })

    await workInput.fill('15')
    await restInput.fill('5')

    await controlPage.click('button:has-text("START")', { force: true })

    const stopButton = controlPage.getByRole('button', {
      name: 'STOP',
      exact: true,
    })

    await expect(stopButton).toBeVisible()

    await expect(controlPage).toHaveScreenshot('control-panel-running.png')
  })

  test('Mock HRM - data streaming', async () => {
    await expect(mockPage).toHaveScreenshot('mock-hrm.png')
  })

  test('Complete workout workflow', async () => {
    // Start streaming from mock client
    await mockPage.click('button:has-text("START")')

    // Configure and start timer
    await controlPage.getByTestId('work-duration-input').fill('10')
    await controlPage.getByTestId('rest-duration-input').fill('5')
    await controlPage.click('button:has-text("START")')

    // Wait for timer to be active on dashboard
    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
      timeout: 20000,
    })

    // Wait for HR data to appear on dashboard
    await expect(dashboardPage.locator('text=Mock User')).toBeVisible({
      timeout: 20000,
    })

    // Stop timer
    await controlPage.click('button:has-text("STOP")')

    // Stop streaming
    await mockPage.click('button:has-text("STOP Streaming")')
  })
})
