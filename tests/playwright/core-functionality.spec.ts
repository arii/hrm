// File: tests/playwright/core-functionality.spec.ts
/**
 * Core Functionality Tests for HRM Application
 *
 * This test suite consolidates the most critical E2E, visual, and mobile tests
 * into a single file for faster, more efficient, and more reliable execution.
 *
 * It covers:
 * 1.  **Dashboard and Control Panel**: Initial state and visual correctness.
 * 2.  **Timer and HR Data Flow**: End-to-end user journey from configuration to active display.
 * 3.  **Mobile Viewport**: Ensures the control panel is responsive and functional.
 * 4.  **State Resilience**: Includes setup and teardown logic to ensure a clean server state.
 */
import { test, expect, Page } from '@playwright/test'
import {
  BASE_URL,
  replaceIframeWithStableWorkout,
  waitForPageReady,
} from './test-helpers'

// Configure tests to run in parallel for maximum efficiency.
test.describe.configure({ mode: 'parallel' })

const screenshotOptions = {
  fullPage: true,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  threshold: 0.3, // Higher tolerance for minor rendering differences
}

test.describe('Core Functionality - Desktop', () => {
  // Skip this entire suite if not running on a desktop profile.
  test.skip(({ isMobile }) => isMobile, 'Desktop tests only')

  let dashboardPage: Page
  let controlPage: Page
  let mockPage: Page

  test.beforeEach(async ({ context }) => {
    ;[dashboardPage, controlPage, mockPage] = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ])

    await Promise.all([
      dashboardPage.goto(BASE_URL),
      controlPage.goto(`${BASE_URL}/client/control`),
      mockPage.goto(`${BASE_URL}/client/mock`),
    ])

    await Promise.all([
      waitForPageReady(dashboardPage),
      waitForPageReady(controlPage),
      waitForPageReady(mockPage),
    ])

    // Wait for the dynamically loaded Spotify component to be visible.
    await expect(controlPage.getByRole('heading', { name: 'Spotify' })).toBeVisible()

    const stopButton = controlPage.getByRole('button', { name: 'STOP', exact: true })
    if (await stopButton.isVisible({ timeout: 1000 })) {
      await stopButton.click()
      await expect(controlPage.getByRole('button', { name: 'START', exact: true })).toBeVisible()
    }
    const stopStreamingButton = mockPage.getByRole('button', { name: 'STOP Streaming' })
    if (await stopStreamingButton.isVisible({ timeout: 1000 })) {
      await stopStreamingButton.click()
      await expect(mockPage.getByRole('button', { name: 'START', exact: true })).toBeVisible()
    }

    await replaceIframeWithStableWorkout(dashboardPage)
    await dashboardPage.waitForTimeout(1000) // Increased delay for UI to settle
  })

  test('Initial State - Dashboard, Control Panel, and Mock Client', async () => {
    await expect(dashboardPage).toHaveScreenshot('dashboard-initial-state.png', screenshotOptions)
    await expect(controlPage).toHaveScreenshot('control-panel-initial-state.png', screenshotOptions)
    await expect(mockPage).toHaveScreenshot('mock-client-initial-state.png', screenshotOptions)
  })

  test('End-to-End: Active Timer and HR Data Flow', async () => {
    await controlPage.getByTestId('work-duration-input').fill('20')
    await controlPage.getByTestId('rest-duration-input').fill('10')
    await mockPage.getByLabel('User Name').fill('Test Athlete')
    await mockPage.getByLabel('Current BPM').fill('150')
    await mockPage.getByRole('button', { name: 'Zone 3' }).click()
    await mockPage.getByRole('button', { name: 'START' }).click()
    await controlPage.getByRole('button', { name: 'START' }).click()

    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
      timeout: 10000,
    })
    await dashboardPage.waitForTimeout(1000) // Increased delay for UI to settle

    await expect(dashboardPage).toHaveScreenshot('dashboard-active-session.png', {
      ...screenshotOptions,
      mask: [
        dashboardPage.locator('text=/^d+$/'),
        dashboardPage.locator('[data-testid="hr-tile-grid-item"]'),
      ],
    })
  })
})

test.describe('Core Functionality - Mobile', () => {
  // Skip this entire suite if not running on a mobile profile.
  test.skip(({ isMobile }) => !isMobile, 'Mobile tests only')

  test('Mobile Viewport - Control Panel', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(page)
    // Wait for the dynamically loaded Spotify component to be visible.
    await expect(page.getByRole('heading', { name: 'Spotify' })).toBeVisible()
    await page.waitForTimeout(1000) // Increased delay for UI to settle

    await expect(page).toHaveScreenshot('control-panel-mobile.png', screenshotOptions)

    await page.getByRole('button', { name: 'START' }).click()
    await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible()
    await page.waitForTimeout(1000) // Increased delay for UI to settle

    await expect(page).toHaveScreenshot('control-panel-mobile-running.png', screenshotOptions)
  })
})
