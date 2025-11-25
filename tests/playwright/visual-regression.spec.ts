// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  replaceIframeWithStableWorkout,
  waitForPageReady,
} from './test-helpers'

// Run tests serially to avoid server state conflicts
test.describe.configure({ mode: 'serial' })

test.describe('Visual Regression Tests', () => {
  test('Dashboard - main viewer page', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Wait for any animations to settle
    await page.waitForTimeout(1000)

    // Replace iframe with stable content
    await replaceIframeWithStableWorkout(page)

    // Ensure timer is not in active state
    try {
      await expect(page.locator('text=/WORK|REST/')).not.toBeVisible({
        timeout: 3000,
      })
    } catch {
      // Timer might already be idle
    }

    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
      mask: [
        page.locator('text=/^\\d+$/'),
        page.locator('text=/\\d+s/'),
      ],
    })
  })

  test('Control Panel - timer and music controls', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(page)

    // Stop timer if running
    try {
      const stopButton = page.getByRole('button', { name: 'STOP', exact: true })
      if (await stopButton.isVisible({ timeout: 2000 })) {
        await stopButton.click()
        await expect(
          page.getByRole('button', { name: 'START', exact: true })
        ).toBeVisible({ timeout: 5000 })
      }
    } catch {
      // Timer not running
    }

    await expect(page).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('Mock HRM Client - test data input', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('mock-hrm-client.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('Dashboard with active timer', async ({ page, context }) => {
    // Open control page to start timer
    const controlPage = await context.newPage()
    await controlPage.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(controlPage)

    // Open dashboard page
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.waitForTimeout(1000)
    await replaceIframeWithStableWorkout(page)

    // Ensure timer mode is available
    await expect(controlPage.getByText('Timer Mode')).toBeVisible({ timeout: 5000 })

    // Start timer with default settings (just click START)
    const startButton = controlPage.getByRole('button', { name: 'START', exact: true })
    await expect(startButton).toBeVisible({ timeout: 5000 })
    await startButton.click()

    // Wait for timer to appear on dashboard
    await expect(page.locator('text=/WORK|REST/')).toBeVisible({ timeout: 10000 })

    await expect(page).toHaveScreenshot('dashboard-active-timer.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      mask: [
        page.locator('text=/^\\d+$/'),
        page.locator('text=/\\d+s/'),
      ],
    })

    // Stop timer
    await controlPage.getByRole('button', { name: 'STOP', exact: true }).click()

    await controlPage.close()
  })

  test('Dashboard with mock HR data streaming', async ({ page, context }) => {
    // Open mock client to send HR data
    const mockPage = await context.newPage()
    await mockPage.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(mockPage)

    // Open dashboard page
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.waitForTimeout(1000)
    await replaceIframeWithStableWorkout(page)

    // Send mock HR data by setting zone (which auto-sends)
    await mockPage.getByTestId('hr-input').fill('145')

    // Wait for HR data to appear on dashboard
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('dashboard-with-hr-data.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
    })

    await mockPage.close()
  })

  test('HR Tiles - all zones', async ({ page, context }) => {
    // Open mock client
    const mockPage = await context.newPage()
    await mockPage.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(mockPage)

    // Open dashboard
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.waitForTimeout(1000)
    await replaceIframeWithStableWorkout(page)

    // Send HR data for different zones using zone buttons
    const zones = [
      { name: 'Zone 1', value: '95' },
      { name: 'Zone 2', value: '115' },
      { name: 'Zone 3', value: '135' },
      { name: 'Zone 4', value: '155' },
      { name: 'Zone 5', value: '175' },
    ]

    for (const zone of zones) {
      await mockPage.getByRole('button', { name: zone.name }).click()
      await page.waitForTimeout(500)
    }

    // Wait for tiles to settle
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('hr-tiles-all-zones.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      threshold: 0.2,
    })

    await mockPage.close()
  })
})
